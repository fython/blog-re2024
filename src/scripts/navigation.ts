interface FetchedPage {
  html: string;
  redirected?: string;
  mediaType: "text/html" | "application/xhtml+xml";
}

interface CacheEntry {
  promise: Promise<FetchedPage | null>;
  timestamp: number;
}

interface TransitionPreparationEvent extends Event {
  from: URL;
  to: URL;
  direction: string;
  navigationType: "push" | "replace" | "traverse";
  sourceElement?: Element;
  info: unknown;
  newDocument: Document;
  signal: AbortSignal;
  formData?: FormData;
  loader: () => Promise<void>;
}

const PREFETCH_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 40;
const LOADING_DELAY_MS = 25;

const pageCache = new Map<string, CacheEntry>();
let domParser: DOMParser | null = null;
let loadingTimer: number | null = null;
let activeClickedEl: HTMLElement | null = null;
let activeNavToken = 0;

function getCacheUrl(rawHref: string): URL | null {
  try {
    const url = new URL(rawHref, window.location.href);
    if (url.origin !== window.location.origin) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function isSameDocument(url: URL): boolean {
  return (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  );
}

function isSaveDataOrSlowConnection(): boolean {
  if (!("connection" in navigator)) return false;
  const conn = navigator.connection as
    { saveData?: boolean; effectiveType?: string } | undefined;
  return Boolean(
    conn?.saveData || (conn?.effectiveType && /2g/.test(conn.effectiveType))
  );
}

function setCacheEntry(key: string, entry: CacheEntry): void {
  if (pageCache.has(key)) {
    pageCache.delete(key);
  } else if (pageCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = pageCache.keys().next().value;
    if (oldestKey !== undefined) {
      pageCache.delete(oldestKey);
    }
  }
  pageCache.set(key, entry);
}

/**
 * Prefetch and deduplicate an internal HTML page into an in-memory promise cache.
 * Simultaneous hovers/taps/clicks share the exact same in-flight fetch.
 */
function prefetchUrl(rawHref: string): Promise<FetchedPage | null> {
  const cacheUrl = getCacheUrl(rawHref);
  if (!cacheUrl) return Promise.resolve(null);

  const key = cacheUrl.href;
  const now = Date.now();
  const cached = pageCache.get(key);
  if (cached && now - cached.timestamp < PREFETCH_TTL_MS) {
    setCacheEntry(key, cached);
    return cached.promise;
  }

  const promise = (async (): Promise<FetchedPage | null> => {
    try {
      const response = await fetch(key, {
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
      const contentType = response.headers.get("content-type") ?? "";
      const mediaType = contentType.split(";", 1)[0]?.trim();
      if (mediaType !== "text/html" && mediaType !== "application/xhtml+xml") {
        return null;
      }
      const html = await response.text();
      if (!response.ok) {
        pageCache.delete(key);
      }
      return {
        html,
        redirected: response.redirected ? response.url : undefined,
        mediaType,
      };
    } catch {
      pageCache.delete(key);
      return null;
    }
  })();

  setCacheEntry(key, { promise, timestamp: now });
  return promise;
}

function shouldPrefetchAnchor(anchor: HTMLAnchorElement): boolean {
  if (!anchor.href) return false;
  if (anchor.dataset.astroReload !== undefined) return false;
  if (anchor.dataset.astroPrefetch === "false") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;

  const url = getCacheUrl(anchor.href);
  if (!url || isSameDocument(url)) return false;
  return true;
}

function handlePrefetchEvent(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest("a");
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (!shouldPrefetchAnchor(anchor)) return;
  void prefetchUrl(anchor.href);
}

function ensureProgressBar(): HTMLDivElement {
  let bar = document.getElementById("astro-nav-progress");
  if (bar instanceof HTMLDivElement) return bar;

  bar = document.createElement("div");
  bar.id = "astro-nav-progress";
  bar.setAttribute("aria-hidden", "true");
  bar.className = "astro-nav-progress";
  document.body.appendChild(bar);
  return bar as HTMLDivElement;
}

function startLoadingFeedback(sourceElement?: Element): void {
  clearLoadingFeedback();
  loadingTimer = window.setTimeout(() => {
    loadingTimer = null;
    document.documentElement.dataset.navLoading = "true";
    if (sourceElement instanceof HTMLElement) {
      activeClickedEl = sourceElement;
      sourceElement.dataset.navClicked = "true";
    }
    const bar = ensureProgressBar();
    bar.dataset.state = "loading";
  }, LOADING_DELAY_MS);
}

function clearLoadingFeedback(): void {
  if (loadingTimer !== null) {
    window.clearTimeout(loadingTimer);
    loadingTimer = null;
  }
  delete document.documentElement.dataset.navLoading;
  if (activeClickedEl) {
    delete activeClickedEl.dataset.navClicked;
    activeClickedEl = null;
  }
  const bar = document.getElementById("astro-nav-progress");
  if (bar) {
    bar.dataset.state = "done";
  }
}

function preloadStyleLinks(newDocument: Document): Promise<void>[] {
  const pending: Promise<void>[] = [];
  for (const el of newDocument.querySelectorAll("head link[rel=stylesheet]")) {
    const href = el.getAttribute("href");
    if (!href) continue;
    // Skip deferred font stylesheets that load asynchronously via media="print" swap.
    if (el.getAttribute("media") === "print") continue;

    const persistId = el.getAttribute("data-astro-transition-persist");
    const hasPersist = persistId
      ? document.querySelector(`[data-astro-transition-persist="${persistId}"]`)
      : null;
    const hasSheet = document.querySelector(
      `link[rel=stylesheet][href="${href}"]`
    );

    if (!hasPersist && !hasSheet) {
      const preload = document.createElement("link");
      preload.setAttribute("rel", "preload");
      preload.setAttribute("as", "style");
      preload.setAttribute("href", href);
      pending.push(
        new Promise<void>(resolve => {
          preload.addEventListener("load", () => resolve(), { once: true });
          preload.addEventListener("error", () => resolve(), { once: true });
          document.head.append(preload);
        })
      );
    }
  }
  return pending;
}

function raceWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal
): Promise<T | null> {
  if (signal.aborted) return Promise.resolve(null);
  return new Promise<T | null>((resolve, reject) => {
    const onAbort = () => resolve(null);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      value => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      err => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      }
    );
  });
}

function prewarmHeaderLinks(): void {
  if (!navigator.onLine || isSaveDataOrSlowConnection()) return;

  const schedule =
    typeof window.requestIdleCallback === "function"
      ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 1500 })
      : (cb: () => void) => window.setTimeout(cb, 200);

  schedule(() => {
    const anchors = document.querySelectorAll<HTMLAnchorElement>(
      ".site-header a[href]"
    );
    const seen = new Set<string>();
    for (const anchor of anchors) {
      if (!shouldPrefetchAnchor(anchor)) continue;
      const cacheUrl = getCacheUrl(anchor.href);
      if (!cacheUrl || seen.has(cacheUrl.href)) continue;
      seen.add(cacheUrl.href);
      void prefetchUrl(cacheUrl.href);
    }
  });
}

function setupNavigationOptimization(): void {
  // Trigger prefetch on initial pointer contact, hover, or keyboard focus (0ms delay).
  for (const eventName of [
    "pointerenter",
    "touchstart",
    "mousedown",
    "focusin",
  ] as const) {
    document.addEventListener(eventName, handlePrefetchEvent, {
      passive: true,
      capture: eventName === "pointerenter",
    });
  }

  document.addEventListener("astro:before-preparation", rawEvent => {
    const event = rawEvent as unknown as TransitionPreparationEvent;
    const token = ++activeNavToken;

    startLoadingFeedback(event.sourceElement);
    event.signal.addEventListener(
      "abort",
      () => {
        if (activeNavToken === token) {
          clearLoadingFeedback();
        }
      },
      { once: true }
    );

    if (event.formData) return;

    const originalLoader = event.loader;
    event.loader = async () => {
      try {
        const page = await raceWithAbort(
          prefetchUrl(event.to.href),
          event.signal
        );
        if (event.signal.aborted) return;

        if (!page) {
          await originalLoader();
          return;
        }

        if (page.redirected) {
          const redirectedTo = new URL(page.redirected);
          if (redirectedTo.origin !== event.to.origin) {
            event.preventDefault();
            return;
          }
          const fragment = event.to.hash;
          event.to = redirectedTo;
          event.to.hash = fragment;
        }

        domParser ??= new DOMParser();
        const nextDocument = domParser.parseFromString(
          page.html,
          page.mediaType
        );
        nextDocument.querySelectorAll("noscript").forEach(el => el.remove());

        if (
          !nextDocument.querySelector('[name="astro-view-transitions-enabled"]')
        ) {
          event.preventDefault();
          return;
        }

        const pendingStyles = preloadStyleLinks(nextDocument);
        if (pendingStyles.length > 0 && !event.signal.aborted) {
          await Promise.all(pendingStyles);
        }
        if (!event.signal.aborted) {
          event.newDocument = nextDocument;
        }
      } finally {
        if (activeNavToken === token) {
          clearLoadingFeedback();
        }
      }
    };
  });

  document.addEventListener("astro:after-swap", clearLoadingFeedback);
  document.addEventListener("astro:page-load", () => {
    clearLoadingFeedback();
    prewarmHeaderLinks();
  });

  prewarmHeaderLinks();
}

setupNavigationOptimization();

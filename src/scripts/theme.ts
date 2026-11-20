export {};

const THEME_KEY = "theme";
const LIGHT = "light";
const DARK = "dark";

function getPreferredTheme(): string {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DARK
    : LIGHT;
}

let themeValue: string =
  (window as unknown as { __theme?: { value: string } }).__theme?.value ??
  getPreferredTheme();

function persist(): void {
  localStorage.setItem(THEME_KEY, themeValue);
  reflect();
}

function getThemeButtons(): Element[] {
  return Array.from(document.querySelectorAll(".theme-toggle-btn, #theme-btn"));
}

function reflect(): void {
  const root = document.firstElementChild;
  root?.setAttribute("data-theme", themeValue);
  root?.classList.toggle("dark", themeValue === DARK);

  for (const btn of getThemeButtons()) {
    btn.setAttribute("aria-label", themeValue);
  }

  // Fill <meta name="theme-color"> with the computed background colour so
  // mobile browser chrome matches the page background.
  const bg = window.getComputedStyle(document.body).backgroundColor;
  document
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", bg);
}

function handleToggle(): void {
  themeValue = themeValue === LIGHT ? DARK : LIGHT;
  persist();
}

function setup(): void {
  reflect();
  const buttons = new Set(getThemeButtons());
  for (const btn of buttons) {
    btn.removeEventListener("click", handleToggle);
    btn.addEventListener("click", handleToggle);
  }
}

setup();

document.addEventListener("astro:after-swap", setup);

document.addEventListener("astro:before-swap", event => {
  const color = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");
  if (color) {
    (event as { newDocument: Document }).newDocument
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", color);
  }
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches }) => {
    themeValue = matches ? DARK : LIGHT;
    persist();
  });

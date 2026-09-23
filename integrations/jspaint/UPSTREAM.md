# JS Paint embedded runtime

Source: https://github.com/1j01/jspaint/tree/bd7ae78e33405b1b0632a9c6e6aeb5afc96575fa
(v1.1.0, MIT; LICENSE.txt is copied into the generated runtime).

JSPaint has no official `jspaint` registry package. The `jspaint` devDependency uses
an official source tarball pinned to the full commit above, installed by pnpm.
The font comes from `@fontsource/fusion-pixel-12px-proportional-sc@5.3.0` (SIL OFL).
`pnpm-lock.yaml` records both dependencies. No download happens in the asset build script.

The Vite plugin `scripts/prepare-paint.mjs` assembles node_modules assets plus this
custom directory into `public/vendor/jspaint/` during config resolution, before Vite
scans public files. It works for both package scripts and direct Astro commands.
Content hashes and output size/mtime are cached in Vite cacheDir/paint-assets.json.
Unchanged files are not rewritten; changed/missing files are copied atomically,
and obsolete generated files are removed. Deleting the cache triggers a full regeneration.
In dev mode this directory is watched, changes are batched, and the page reloads after
synchronization. Edit files here, not the Git-ignored generated directory.
Dependency installation must include devDependencies, like the rest of the build toolchain.
Runtime source, classic theme, tool/cursor icons and dialog sound and bundled library licenses are retained.
This embed omits desktop/PDF/head-tracking integrations, standalone menus and persistent sessions.
The compact menu uses the bundled MenuBar with canvas reset, undo/redo and an attribution dialog.
The widget title bar reuses the bundled os-gui Windows 98 theme and JS Paint icon.
The parent PaintWidget shows a locally hosted retro hourglass until the iframe sets data-ready.
Startup waits for the classic styles, pixel font, image decoding (including CSS sprites),
the seeded canvas and two animation frames. Initialization errors keep the iframe hidden
and expose a retry button; loading does not change the widget height.
Our integration files are index.html, ephemeral.js, widget.js and widget.css.
Do not replace this with the upstream index.html: it enables automatic saving.

The initial rice cracker SVG is Twemoji 16.0.1 by Twitter and contributors:
https://github.com/jdecked/twemoji/blob/v16.0.1/assets/svg/1f358.svg
Licensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
The image is adapted into a 32×32 pixel sprite with a limited palette and a silhouette enlarged 7× without smoothing, with independent 2×2-pixel deterministic stochastic spray lighting (light above, shadow below) onto a white editable canvas. Rice and seaweed boundaries use deterministic 6px-radius material scatter, preserving the outer silhouette.

Widget UI font: Fusion Pixel 12px Proportional (Simplified Chinese flavor, including Latin),
provided by Fontsource 5.3.0 (font upstream version v2024.05.12).
Despite `latin` in the package filename, this file contains the Chinese glyphs too.
The unmodified WOFF2 and its OFL license are copied to fonts/ in the generated runtime.
https://github.com/fontsource/font-files/tree/main/fonts/other/fusion-pixel-12px-proportional-sc

Loading indicator: unmodified HOURGLAS.GIF from retrores, saved as
public/images/paint-hourglass.gif (32×32, 1995 bytes).
Source: https://github.com/1j01/retrores/blob/master/static/resources/cursors/gif/HOURGLAS.GIF
SHA-256: 0bba74c7f29eeb3022e4a6de06fd706bcede42cbcafab83a2de83ca35ae7d0ff

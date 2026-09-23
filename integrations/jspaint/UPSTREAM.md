# JS Paint embedded runtime

Source: https://github.com/1j01/jspaint/tree/bd7ae78e33405b1b0632a9c6e6aeb5afc96575fa
(v1.1.0, MIT; LICENSE.txt is copied into the generated runtime).

JSPaint has no official `jspaint` registry package. The `jspaint` devDependency uses
an official source tarball pinned to the full commit above, installed by pnpm.
The font comes from `@fontsource/fusion-pixel-12px-proportional-sc@5.3.0` (SIL OFL).
`pnpm-lock.yaml` records both dependencies. No download happens in the asset build script.

`pnpm prepare:paint` copies the required runtime assets from node_modules and overlays
this directory into `public/vendor/jspaint/`. `pnpm dev` and `pnpm build` run it automatically.
The generated directory is ignored by Git and replaced on each run; edit files here instead.
If invoking Astro directly, run `pnpm prepare:paint` first. Dependency installation must
include devDependencies, as with the rest of this project's build toolchain.
Runtime source, classic theme, tool/cursor icons and dialog sound and bundled library licenses are retained.
This embed omits desktop/PDF/head-tracking integrations, standalone menus and persistent sessions.
The compact menu uses the bundled MenuBar with canvas reset, undo/redo and an attribution dialog.
The widget title bar reuses the bundled os-gui Windows 98 theme and JS Paint icon.
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

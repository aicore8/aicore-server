# NUI foundation: stack, scale, CEF 144

Read before writing any NUI code. Colours, panel looks and the sibling each screen copies: `docs/design.md`.

## Stack

- React 19 + Vite on the bun runtime (`bunx --bun vite`) + TypeScript, Redux Toolkit (server data: snapshot + deltas), Tailwind v4 (`@tailwindcss/vite`), shadcn/ui on Radix (`radix-ui`), `motion` (`motion/react`), `fivem-nui-react` (`useNuiEvent`, `fetchNui` with `mockData` for the browser preview). Never mix two motion packages.
- TanStack Router for which screen or tab is open in any NUI with tabs or sub screens: always `createMemoryHistory` (no URL, no F5 in NUI); the browser preview seeds the start address from the hash. Server data stays in Redux, the router holds only the location. Single-screen NUIs (HUD, chat, notifications) have no router.
- Lists: a generic `VirtualList` on `@tanstack/react-virtual` for every scrolling list of data. Debounce/throttle: `@tanstack/react-pacer`.
- Icons: Font Awesome named imports. FA's svg-core injects unlayered CSS that beats Tailwind's size utilities: set `config.autoAddCss = false` before rendering and `@import "@fortawesome/fontawesome-svg-core/styles.css" layer(base);` in the main CSS. Same trap with any hand-written reset: put it in `@layer base`.

## vh scale

- One unit, vh, with `10px = 1vh`. No literal px/rem except a 1px hairline. The `@theme inline` override turns every utility into vh:

```css
@theme inline {
  --spacing: 0.4vh;
  --text-xs: 1.2vh;   --text-xs--line-height: 1.6vh;
  --text-sm: 1.4vh;   --text-sm--line-height: 2vh;
  --text-base: 1.6vh; --text-base--line-height: 2.4vh;
  --text-lg: 1.8vh;   --text-lg--line-height: 2.8vh;
  --text-xl: 2vh;     --text-xl--line-height: 2.8vh;
  --radius-sm: calc(var(--radius) - 0.4vh);
  --radius-md: calc(var(--radius) - 0.2vh);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 0.4vh);
}
:root { --radius: 0.6vh; }
```

- Literal values left in shadcn sources are converted by hand (`-3px` → `-0.3vh`, `h-px` → `h-[0.1vh]`). JS that needs pixels (virtualizer, offsets): `innerHeight / 100 * vh`.
- Hairlines are whole pixels: `0.1vh` is 1.08px at 1080p and CEF drops it on rounded corners; use `1px` for borders that must show.

## CEF (Chromium 144) limits

FiveM NUI runs Chromium 144 since 3-4 Nov 2026 (client build 38329; before it Chromium 103). Chrome 144 features are free to use. The tgiann-ui skill's `cef-144.md` (owner's machine) holds the full 103 migration table; ai-core code is already migrated.

Broke in 144 (never write these):

- `alert()` / `confirm()` do not exist in the NUI: use an AlertDialog.
- Mutation events (`DOMNodeInserted`, `DOMSubtreeModified`): `MutationObserver`.
- Clipboard: `navigator.clipboard` is blocked in the resource iframe, and an unfocused `document.execCommand("copy")` (the `copy-to-clipboard` package) silently copies nothing. Put the text in a readonly textarea, `focus()` + `select()` it, then `execCommand("copy")`, only inside a real click or key press; give the focus back afterwards. A copy started from Lua needs a small window whose button / Enter / Ctrl+C is that key press.
- CSS `zoom` follows the standard now: scale with the vh units or `transform: scale()`.
- `fx_version "cerulean"` only (`adamant` / `bodacious` can block the NUI); no `__resource.lua`.

No longer limits (Tailwind v4 output works as it is):

- Split `translate-*` / `scale-*` / `rotate-*` utilities (Chrome 104): centre with `top-1/2 -translate-y-1/2` / `-translate-x-1/2`, press with `active:scale-97`. They compose with `transform` in the order translate → rotate → scale → transform, so a keyframe or Motion inline `transform` no longer wipes a centring class (shadcn Dialog's `zoom-in-95` is fine). Never write the same offset twice, as a class and inside a Motion `transform` string. A `transition-[...]` list that eases a press names `scale` (or use `transition` / `transition-transform`); `transition-colors` with a press scale snaps.
- `shadow-*`, `ring-*`, `bg-linear-*`, oklch / oklab / `color-mix()` (Chrome 111): no postcss chain. The entry CSS keeps `@custom-variant hover (&:hover);` so hover styles do not depend on `@media (hover: hover)`. Never set `build.target`.
- `linear()` easing (Chrome 113): Motion springs run on WAAPI (`references/performance.md`).

Still true on 144:

- `backdrop-filter` does not see the game picture (the NUI is drawn as a separate texture): without a game-view element under the panel, the panel background is opaque. Never animate opacity on a layer holding blur (seen on 103, not retested).
- No unlayered global rules in `index.css` (they beat utilities): global styles in `@layer base`, custom classes as `@utility`, entry animations as `--animate-*` in `@theme`.
- A Radix Popover / DismissableLayer opened from an input's `onFocus` closes at once: its document `focusin` listener is added synchronously when the content mounts, inside React's handling of that same native `focusin`, which then bubbles to the document with the input (outside the content) as target. Typing works because no new focus happens. Fix in the popover primitive: `onInteractOutside` calls `preventDefault()` when the target is inside the anchor (ai-core `components/ui/popover.tsx`).
- Radix portals are not hidden by CSS: close them with `open={open && !minimized}`. A `fixed` menu inside a `pointer-events-none` parent inherits it: give it `pointer-events-auto`.
- A child that takes its width from `aspect-square` inside a `w-max` parent counts as 0 width on first layout: give icon buttons a fixed width (seen on 103, not retested).
- Variable fonts get a halo in bold: use static weights (`@fontsource/inter/400.css` ... `700.css`) and `font-synthesis: none` (seen on 103, not retested).
- Virtual list rows use `Math.round(start)`; fractional translateY blurs text.
- Resource files are root-relative or `https://cfx-nui-<resource>/...`; never build `nui://` URLs.
- The dev server needs `server.fs.allow` to reach the bun store, or fonts 403 in the preview (`.claude/rules/nui.md`).

## Typography

- Body Inter; display font as `docs/design.md` says (uppercase, extrabold, `leading-none`). Sizes: labels 1.2vh (floor), body 1.3-1.4vh, emphasis by weight (400 → 500), not size.
- Tracking: 2.4vh+ `-0.02em`, 1.8-2vh `-0.01em`, body 0, small uppercase labels `+0.04em`. Wrapped text line height at least 1.4. `truncate` with `leading-none` cuts descenders: use `leading-[1.3]`.
- Changing numbers `tabular-nums`; number columns right-aligned. Write texts naturally in the lang file and uppercase them with CSS.
- `user-select: none` at the root; kill the focus outline but keep a visible `focus-visible` ring on buttons and links (inputs show focus on their wrapper with `focus-within`).
- White HUD text without a background: one `drop-shadow(0.15vh 0.1vh 0 rgba(0,0,0,0.75))` on the container.

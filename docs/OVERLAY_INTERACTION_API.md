# Overlay Interaction API

Unified right-click / hotkey / touch-gesture system for custom menus, sidebars and
page surfaces. Lives in `frontend/src/overlay/OverlayInteractions.js` and is mounted
once in `App.js` via `<OverlayInteractionProvider>` (inside `CartAnimationProvider`).

## Consumers wired today

| Surface | Hook used | What it does |
| ------- | --------- | ------------ |
| `components/Sidebar.js` | `useContextMenu(navRef, …)` | Right-click / long-hold any nav or tool row → Open / new tab / run action / Quick-links submenu; empty area → theme toggle, hide sidebar |
| `pages/Dashboard.js` | `useContextMenu(rootRef, …)` | Home menu on non-interactive chrome → Add item (focuses form), Refresh lists, Notepad, Tools submenu, AVE toggle (admins). Returns `null` over inputs/buttons so the browser keeps its native menu |
| `components/notepad/Notepad.js` | `useOverlayHotkeys` + `useOverlayTarget` | Ctrl+wheel zoom / Ctrl+Shift+wheel text scale / Ctrl+Alt+wheel UI scale (scoped to notepad shell, kills Opera page zoom); pinch = text scale; touch long-hold = block context menu |

The Notepad keeps its own themed menu renderer (drag strip, flip placement, mobile
sheet). The provider's engine powers declarative menus everywhere else.

## API surface

### `useOverlay()`

Returns `{ openMenu, close, patch, pushSub, popSub, menu, isMobile }`.
`openMenu({ x, y, title, items|render, payload, scopeEl, palette, width, maxH, draggable })`
positions at the point, flips at `scopeEl`/viewport edges, clamps post-measure,
drag handle = title strip, bottom-sheet on mobile.

### Menu items (declarative)

```js
oiRow({ icon, label, tint, danger, checked, disabled, hint, onClick, submenu, closeOnClick })
oiHeader(label, tint)   // section label
oiSep()                 // divider
oiCustom(render)        // free-form JSX
oiSub(label, icon, [items])  // submenu (push/pop via chevron + back row)
```

Or `render: (payload, {close, patch}) => JSX` for fully custom bodies.

`palette`: `{ panel, text, muted, hover, side }` — Tailwind classes per menu.

### `useOverlayTarget(ref, cfg)` — gesture engine

```js
useOverlayTarget(ref, {
  contextMenu,          // items array or fn(evt)->spec; right-click + touch long-hold
  onContextMenu,        // raw handler (runs alongside)
  onTap, onDoubleTap,   // <300ms, <10px
  onHold, onLongHold,   // 350ms / 650ms (holdMs/longHoldMs)
  onSwipe,              // 'left|right|up|down' (swipePx, default 40px / <600ms)
  onPinch, onPinchIn, onPinchOut, onPinchStart,  // two-pointer scale ratio + center
  onDrag, onDragEnd,    // movement past 10px
  mouseHold,            // opt-in: let mouse long-holds open contextMenu
  enabled,
});
```

Callbacks get `{ x, y, target, pointerType, original }`. Movement >10px cancels holds.
Long-hold auto-fires `contextMenu` for touch/pen only (mouse uses right-click).

### `useOverlayHotkeys(map, { scopeRef, enabled })`

Window-level **capture** listeners — the only reliable way to beat the browser's
native Ctrl+wheel zoom (Opera/Chrome). Chords normalize to `ctrl+alt+shift+base`:

```js
useOverlayHotkeys({
  'ctrl+wheel':       (e) => ...,   // wheel chords get the raw WheelEvent
  'ctrl+shift+wheel': (e) => ...,
  'ctrl+alt+wheel':   (e) => ...,
  'alt+wheel':        (e) => ...,
  'ctrl+k':           (e) => ...,   // key chords match e.key (lowercase)
  'escape':           (e) => ...,
}, { scopeRef: panelRef, enabled: isOpen });
```

With `scopeRef` set, handlers only fire when `e.target` is inside that element —
outside it the browser keeps its native behavior. Matched chords get
`preventDefault` + `stopPropagation`.

### Shortcuts

- `useContextMenu(ref, provider)` — right-click + long-hold; provider returns items array or full spec, `null` keeps native menu
- `useHoldMenu(ref, provider)` — long-hold menu only
- `usePinch(ref, fn)` — pinch scale callback

## Adding a menu to a new surface

1. `const ref = useRef(null)` → put `ref={ref}` on the container.
2. `useContextMenu(ref, (e) => ({ title: 'X', items: [oiRow(...)] }))`
   — or return `null` to skip (native menu stays).
3. Tag interactive children with `data-oi-*` attributes and resolve them via
   `e.target.closest('[data-oi-…]')` to make one target serve many rows
   (Sidebar pattern).

## Behavior notes

- Z-order: backdrop `z-80`, menu `z-90` — above Dashboard chrome, below `MenuPanel` z-95.
- One menu at a time; `pushSub/popSub` stack handles submenus.
- Escape closes via the backdrop; each consumer may also bind `'escape'` via `useOverlayHotkeys`.
- Gestures use Pointer Events — mouse, touch and pen unified; `pointercancel` cleans up.

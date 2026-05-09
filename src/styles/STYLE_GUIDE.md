# Pizzapolis visual structure

This folder centralizes the visual system so future changes are easier.

## Files

- `tokens.css` â†’ color tokens, surface tokens, spacing, shadows, radii, shared layout constants.
- `base.css` â†’ resets, viewport fixes, scrollbar, typography baseline.
- `components.css` â†’ reusable visual primitives (`app-card`, `app-surface`, `screen-shell`, `mobile-tabbar`, etc.).
- `map.css` â†’ Leaflet overrides and marker styling.
- `utilities.css` â†’ small utility helpers (`full-viewport`, `hide-scrollbar`, etc.).

## Rules for future changes

1. Change palette, radii, shadows and sizes in `tokens.css` first.
2. Reuse component classes from `components.css` before adding long Tailwind strings.
3. Keep page shells consistent by using:
   - `app-shell`
   - `app-content`
   - `screen-shell`
   - `screen-header`
4. Put map-only styling in `map.css`.
5. Avoid adding viewport hacks inline in pages; prefer `base.css` or `utilities.css`.

## Existing shared classes

- `app-shell`
- `app-header`
- `app-header-inner`
- `app-brand`
- `app-page`
- `app-content`
- `screen-shell`
- `screen-shell--narrow`
- `screen-header`
- `screen-title`
- `screen-subtitle`
- `app-surface`
- `app-card`
- `app-card-muted`
- `app-chip`
- `app-chip--accent`
- `app-chip--success`
- `app-button-primary`
- `app-button-secondary`
- `app-fab`
- `mobile-tabbar`
- `mobile-tabbar-grid`
- `bottom-safe`
- `sheet-panel`
- `sheet-handle`
- `floating-back-button`
- `chat-shell`
- `chat-input-shell`

## State architecture
- Server state should live in TanStack Query.
- Temporary UI state should live in Zustand stores under `src/stores/`.
- Forms should use React Hook Form + Zod validators from `src/lib/validators/`.


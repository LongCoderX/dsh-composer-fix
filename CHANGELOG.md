# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Active phase uses `position: fixed` instead of `position: absolute`.** Sticky doesn't engage when the chat content fits inside the viewport (no overflow), so the dialog sat in the natural-flow position — which on a short conversation is the middle of the column. Fixed against the viewport always works.
- **`scrollbar-gutter` is now `auto` in the active case** (was upstream's `stable`, which reserved an 8px gap for a scrollbar that wasn't always there).
- **Hero phase also uses `position: fixed` with `justify-content: flex-end`** on the scroll body (was `position: absolute; justify-content: center`, which left the dialog floating in the middle).
- **Trajectory / overlay mode override**: explicit `.scrollBody:has([data-conversation-composer-overlay]) > [data-composer-seat]` rule that pins the seat to `position: fixed` regardless of the overlay's own height.

### Added
- **Rightbar width publishing**: a tiny `MutationObserver` watches the AppFrame's `grid-template-columns` inline style and republishes the rightbar width as `--dsw-frame-rightbar-width` (and sidebar as `--dsw-frame-sidebar-width`). The dialog now responds to right-sidebar open/close/drag, shrinking or expanding to match the available conversation column width.
- **CHANGELOG.md** to document the fix surface.

## [0.1.0] - 2026-09-17

### Added
- Initial release.
- Hero phase: hide the right scrollbar; pin the composer to the bottom of the viewport; hide the orphan stats dock.
- Active phase: pin the composer; reserve bottom padding equal to the composer height via the upstream `ResizeObserver`-published `--dsh-composer-height`.
- Install via `cordis.patch.yml` `insert:` syntax; the Cordis HMR channel loads the plugin without a server restart.

# dsh-composer-fix

Pin the DeepSeek Harness conversation composer (input box) to the bottom
of the viewport across all phases, hide the orphan stats dock in hero,
reserve scroll space equal to the composer height so messages can
scroll past it, and react to the right sidebar opening/closing so the
dialog never extends behind the rightbar.

Pure-CSS overlay with a tiny bit of JS for the rightbar width
publishing — no upstream bundle edits. Survives `dsh upgrade` /
`npm install` because the plugin lives in user-owned paths
(`~/.dsh/`). Loaded via the Cordis HMR channel through
`cordis.patch.yml`'s `insert:` syntax, so no server restart is
needed to install or remove.

## What it fixes

Upstream (and the `deep-current` skin) lay the composer out in ways
that don't quite work for everyone:

- **Hero phase** ("new conversation" page): the composer sits in the
  middle of the viewport at a non-zero offset from the bottom; a
  right scrollbar appears and lets you scroll past the dialog.
- **Active phase** (existing session with short content): the
  composer falls back to in-flow position when there isn't enough
  scrollable content for `position: sticky` to engage, leaving the
  dialog floating in the middle.
- **Active phase** (existing session, dialog grows tall): the last
  message gets covered by the expanding composer because the
  conversation area doesn't reserve room for it.
- **Active phase, trajectory / overlay tab**: the upstream
  `.scrollBody:has([data-conversation-composer-overlay])>.composerSeat
  { position: absolute }` rule pins the dialog to the overlay
  container — which when the view content is short leaves the dialog
  floating mid-page.
- **Active phase, right sidebar open**: the dialog has a fixed
  `right: 0` so it extends behind the rightbar, hiding part of the
  input.

This plugin fixes all five with one CSS file (plus a tiny
ResizeObserver-driven JS helper) injected on every page load.

## How it works

The plugin's `lib/client.js` is a CommonJS module that exports
`{ apply, inject }`. The `apply` hook injects a `<style>` tag into
the document head containing all the override CSS, and also starts a
`MutationObserver` that watches the AppFrame's `grid-template-columns`
inline style and re-publishes the sidebar / rightbar widths to
`--dsw-frame-sidebar-width` and `--dsw-frame-rightbar-width`. Because
the plugin is registered via the `insert:` directive in
`cordis.patch.yml`, Cordis HMR picks it up without a server restart.

The four positioning rules:

| Phase | Strategy | Why |
|-------|-----------|-----|
| **Hero** | `position: fixed; bottom: 0; left: var(--sidebar); right: var(--rightbar)` | `position: sticky` doesn't engage when content fits; `position: absolute` against a parent that may not fill the viewport also fails. `fixed` against the viewport always works. |
| **Active** | same as hero, plus `padding-bottom: var(--dsh-composer-height, 0px) !important` on `.scrollBody` | The upstream ResizeObserver publishes the composer height into `--dsh-composer-height`; we consume it to reserve scroll space so the last message can't be hidden by the growing dialog. |
| **Trajectory / overlay** | explicit override: `.scrollBody:has([data-conversation-composer-overlay]) > [data-composer-seat] { position: fixed !important; ... }` | upstream sets `position: absolute; bottom: 0` which is short-content-fragile; we override to `fixed`. |
| **Sidebar resize** | `MutationObserver` on `[data-dsh-frame]`'s `style` attribute | Parses the new `grid-template-columns` value, republishes `--dsw-frame-sidebar-width` and `--dsw-frame-rightbar-width`, and the dialog width follows automatically. |

The `scrollbar-gutter: auto !important` rule replaces upstream's
`stable`, which reserved 8px of space for a scrollbar that wasn't
always there — that 8px gap was the visible "shadow" between the
dialog and the viewport bottom in the chat case.

The `[data-composer-stats]` hide in hero stops the previous
session's token-usage summary from leaking onto the new-conversation
page.

## Install

The plugin is **not** on npm. Install it from your own Git host.

### 1. Drop the files in (simplest)

```bash
# If you already have the plugin in your dsh profile (from a previous
# local install), it's at:
ls ~/.dsh/profiles/web/node_modules/dsh-composer-fix/

# To install from a fresh git clone:
git clone https://github.com/LongCoderX/dsh-composer-fix.git /tmp/dsh-composer-fix
cp -R /tmp/dsh-composer-fix ~/.dsh/profiles/web/node_modules/dsh-composer-fix
```

### 2. Register it via cordis HMR

Add to `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: composer-fix
      name: "dsh-composer-fix"
```

(The Cordis HMR service watches this file with `patchReload: "live"`,
which is the default. No server restart is required — save the file
and refresh the browser a few seconds later.)

### 3. Verify

```bash
# In a browser devtools console, after the page loads:
JSON.stringify({
  css: !!document.querySelector('style[data-plugin-css="dsh-composer-fix/styles.css"]'),
  sidebar: getComputedStyle(document.documentElement).getPropertyValue('--dsw-frame-sidebar-width'),
  rightbar: getComputedStyle(document.documentElement).getPropertyValue('--dsw-frame-rightbar-width'),
  seatBottom: document.querySelector('[data-composer-seat]')?.getBoundingClientRect().bottom
})
// → { css: true, sidebar: "280px", rightbar: "0px", seatBottom: 597 (== viewport) }
```

## Uninstall

```bash
# 1. Remove the - insert: block from cordis.patch.yml
# 2. Wait a couple of seconds for HMR
# 3. Refresh the browser
# 4. Delete the plugin directory
rm -rf ~/.dsh/profiles/web/node_modules/dsh-composer-fix/
```

The upstream bundle is untouched at all times. There is no
"uninstall" cleanup to run inside dsh itself.

## Upgrades

`dsh upgrade` / `npm install` rewrites the upstream bundle files
but never touches `~/.dsh/`, so the plugin keeps working across
upgrades. If you change the plugin code locally and want to publish
a new version, bump `version` in `package.json` and tag a release.

## Compatibility

- DeepSeek Harness **>= 0.1.5-rc.1** (when `dsh.profile.patchReload`
  became `"live"` by default).
- Tested against `deep-current` skin. Other skins should work as
  long as they don't aggressively override the `!important` rules
  in this plugin.

## Files

```
dsh-composer-fix/
├── README.md
├── LICENSE
├── package.json
├── CHANGELOG.md
├── cordis.patch.yml          # Plugin metadata consumed by dsh loader
├── lib/
│   └── client.js             # CSS string + module.exports.{apply,inject} + ResizeObserver
└── .github/
    └── workflows/
        └── ci.yml            # CI smoke load
```

## License

MIT

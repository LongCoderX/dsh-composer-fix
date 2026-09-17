# dsh-composer-fix

Pin the DeepSeek Harness conversation composer (input box) to the bottom
of the viewport in both hero and active phases, hide the orphan stats dock
in hero, and reserve scroll space equal to the composer height so
messages can scroll past the composer when it grows.

Pure CSS overlay — no upstream bundle edits. Survives `dsh upgrade` /
`npm install` because the plugin lives in user-owned paths (`~/.dsh/`).
Loaded via the Cordis HMR channel through `cordis.patch.yml`'s `insert:`
syntax, so no server restart is needed to install or remove.

## What it fixes

Upstream (and the `deep-current` skin) lay the composer out in three
ways that don't quite work for everyone:

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
- **Active phase** (right sidebar open): the dialog has a fixed
  `right: 0` so it extends behind the rightbar, hiding part of the
  input.

This plugin fixes all four with one CSS file injected on every page
load.

## How it works

The plugin's `lib/client.js` is a CommonJS module that exports
`{ apply, inject }`. The `apply` hook injects a `<style>` tag into
the document head containing all the override CSS. Because the
plugin is registered via the `insert:` directive in
`cordis.patch.yml`, Cordis HMR picks it up without a server
restart.

The active-phase fix uses `position: absolute` with `left: 0;
right: 0` and **deliberately does not set `position` on
`scrollBody`**, so the absolute containing block is the next
positioned ancestor up — `wSkVaW_root`, which lives inside
`centerCol`. When the right sidebar opens or closes,
`centerCol`'s width changes (driven by the AppFrame grid), and the
dialog width follows automatically.

The active-phase `padding-bottom: var(--dsh-composer-height, 0px)
!important` is the load-bearing trick: the upstream conversation
package writes a `ResizeObserver` that already updates that CSS
variable on every composer resize; this plugin just consumes it
to reserve scroll space equal to the composer's height.

## Install

The plugin is **not** on npm. Install it from your own Git host.

### 1. Drop the files in (simplest)

```bash
# If you already have the plugin in your dsh profile (from a previous
# local install), it's at:
ls ~/.dsh/profiles/web/node_modules/dsh-composer-fix/

# To install from a fresh git clone:
git clone https://github.com/<your-org>/dsh-composer-fix.git /tmp/dsh-composer-fix
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
JSON.stringify(!!document.querySelector('style[data-plugin-css="dsh-composer-fix/styles.css"]'))
// → true
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
├── cordis.patch.yml          # Plugin metadata consumed by dsh loader
├── lib/
│   └── client.js             # CSS string + module.exports.{apply,inject}
└── .github/
    └── workflows/
        └── ci.yml            # (Optional) Node version matrix check
```

## License

MIT

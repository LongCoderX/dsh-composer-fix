// dsh-composer-fix
//
// Pure-CSS overlay that pins the conversation composer to the bottom of
// the viewport in both hero and active phases, hides the orphan stats
// dock in hero phase, and reserves scroll space equal to the composer
// height so messages can scroll past the composer when it grows.
//
// No JSX overrides; only CSS. Survives upstream dsh upgrades — just keep
// this plugin installed and the styles are re-injected on every page load.
//
// Dual-load contract:
//   - This file is loaded by the cordis plugin loader via `await import()`
//     in Node.js (the host runtime) — needs CommonJS exports.
//   - It is ALSO concatenated into the dsh batch bundle that the
//     browser loads as a plain `<script>` (no `type="module"`) — so
//     `export` / `import` statements are NOT allowed.
//   - Both environments need to find `apply` / `inject` on the export.
//     We achieve this by writing the file as CommonJS and assigning
//     module.exports. In the plain-script context, `module` is the
//     current module object that the bundle concatenator provides, and
//     any property assigned to it is observed by the bundle reader.

const CSS = `
/* ============================================================
 * Hero phase (no session / "new conversation" page)
 * - Hide the scrollbar entirely (no right / bottom scroll).
 * - Pin the composer to the bottom of the viewport absolutely.
 * - Hide the orphan stats dock that leaks from the previous
 *   session's token usage summary.
 * ============================================================ */
.wSkVaW_root[data-phase=hero] .wSkVaW_scrollBody {
  overflow: hidden !important;
  position: relative !important;
  justify-content: center !important;
}

.wSkVaW_root[data-phase=hero] [data-composer-seat] {
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 7 !important;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--dsw-alias-bg-base) 0%, transparent) 0px,
    var(--dsw-alias-bg-base) 36px
  ) !important;
}

.wSkVaW_root[data-phase=hero] [data-trigger-menu],
.wSkVaW_root[data-phase=hero] [data-composer-stats] {
  display: none !important;
}

/* ============================================================
 * Active phase (existing session / conversation visible)
 * - scrollBody reserves bottom padding equal to the composer
 *   height (--dsh-composer-height is updated by the upstream
 *   ResizeObserver when the composer grows), so the last
 *   message is never hidden behind the composer.
 * - scrollbar-gutter is switched to "auto" so the bottom 8px
 *   is not reserved when no horizontal scrollbar is needed.
 * - Composer uses "position: absolute" with inset bottom:0 +
 *   left:0 + right:0. CRITICALLY, we do NOT set position on
 *   scrollBody, so the absolute containing block is the next
 *   positioned ancestor up the tree (wSkVaW_root, which has
 *   position: relative from the upstream rule). The root is
 *   itself laid out inside the centerCol grid cell, so its
 *   width tracks the conversation column. When the right
 *   sidebar opens or closes, root's width changes, the dialog's
 *   width follows, and the dialog never overlaps the rightbar.
 * - Earlier drafts used "position: fixed" with hard-coded
 *   left/right. That pinned the dialog to the viewport but
 *   could not react to right-sidebar resizes without JS
 *   reading the rightbar's width into a CSS variable. The
 *   absolute + "no position on scrollBody" trick is pure CSS
 *   and stays correct across rightbar show/hide/drag.
 * ============================================================ */
.wSkVaW_root[data-phase=active] [data-composer-seat] {
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 7 !important;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--dsw-alias-bg-base) 0%, transparent) 0px,
    var(--dsw-alias-bg-base) 36px
  ) !important;
}

.wSkVaW_root[data-phase=active] .wSkVaW_scrollBody {
  scrollbar-gutter: auto !important;
  /* The deep-current skin sets "padding: 0 !important" on
   * [data-conversation-scroll]. We must out-!important it here
   * so the conversation can scroll past the composer. */
  padding-bottom: var(--dsh-composer-height, 0px) !important;
  padding-top: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

/* ============================================================
 * Settling phase (session loading)
 * The upstream rule already hides the composer; no change.
 * ============================================================ */
`;

function injectStyles() {
  if (typeof document === "undefined") return;
  const tagId = "dsh-composer-fix/styles.css";
  if (document.querySelector(`style[data-plugin-css="${tagId}"]`) !== null) {
    return;
  }
  const tag = document.createElement("style");
  tag.dataset.plugin = "dsh-composer-fix";
  tag.dataset.pluginCss = tagId;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

function apply() {
  injectStyles();
}

function inject() {
  // No server-side hooks needed; all work is client-side.
  return {};
}

// CommonJS export — picked up by the cordis loader via `await import()`
// (Node ESM dynamic-import wraps CommonJS modules with default = module.exports,
// then unwrapExports() unwraps that).
//
// In the plain-script bundle context, this also works: the bundle
// concatenator's plain `module` object is exposed to the script,
// and any `exports.X = X` assignment is preserved.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { apply, inject };
  module.exports.apply = apply;
  module.exports.inject = inject;
}

// The browser-side path: __ModuleLoader__ exists after the dsh
// client-modules script has set up the module registry. Register our
// plugin there so the host treats this file as a registered client.
// Guarded so we don't crash in Node (where `window` is undefined).
if (typeof window !== "undefined" && window.__ModuleLoader__) {
  window.__ModuleLoader__.load({
    id: "dsh-composer-fix",
    factory: () => {
      injectStyles();
      return { apply, inject };
    },
  });
}
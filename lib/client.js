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
//   - This file is loaded by the cordis plugin loader via await import()
//     in Node.js (the host runtime) — needs CommonJS exports.
//   - It is ALSO concatenated into the dsh batch bundle that the
//     browser loads as a plain <script> (no type="module") — so
//     export / import statements are NOT allowed.
//   - Both environments need to find apply / inject on the export.
//     We achieve this by writing the file as CommonJS and assigning
//     module.exports. In the plain-script context, module is the
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
  justify-content: flex-end !important;
}

.wSkVaW_root[data-phase=hero] [data-composer-seat] {
  position: fixed !important;
  bottom: 0 !important;
  left: var(--dsw-frame-sidebar-width, 280px) !important;
  right: var(--dsw-frame-rightbar-width, 0px) !important;
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
 * - Composer uses "position: fixed" (NOT absolute/sticky).
 *   The upstream's default position:sticky fails when the chat
 *   content fits inside the viewport (sticky only engages once the
 *   scroll container has overflow), so the dialog sits in the
 *   natural-flow position — which on a short conversation is the
 *   middle of the column, not the bottom. The trajectory
 *   view's "overlay" case has the same problem: its
 *   position:absolute; bottom:0 rule pins to the overlay
 *   container, which when the view content is short leaves the
 *   dialog floating mid-page. position:fixed sidesteps both
 *   because its containing block is the viewport.
 * - left/right are anchored to the conversation column via
 *   upstream-defined CSS variables (--dsw-frame-sidebar-width,
 *   --dsw-frame-rightbar-width). When the right sidebar opens or
 *   closes, --dsw-frame-rightbar-width changes and the dialog
 *   width follows.
 * ============================================================ */
.wSkVaW_root[data-phase=active] [data-composer-seat] {
  position: fixed !important;
  bottom: 0 !important;
  left: var(--dsw-frame-sidebar-width, 280px) !important;
  right: var(--dsw-frame-rightbar-width, 0px) !important;
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

/* Trajectory / overlay mode: upstream sets
 *   .scrollBody:has([data-conversation-composer-overlay])>.composerSeat { position:absolute }
 * which pins the dialog to the overlay container — leaving it mid-page
 * when the overlay content is short. Override to fixed so the seat stays
 * glued to the viewport bottom regardless of the overlay's own height. */
.wSkVaW_root[data-phase=active] .wSkVaW_scrollBody:has([data-conversation-composer-overlay]) > [data-composer-seat] {
  position: fixed !important;
  bottom: 0 !important;
  left: var(--dsw-frame-sidebar-width, 280px) !important;
  right: var(--dsw-frame-rightbar-width, 0px) !important;
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

// Watch the rightbar's width and publish it as --dsw-frame-rightbar-width
// (and --dsw-frame-sidebar-width as a side effect) so the CSS rules
// above can size the dialog correctly when the right sidebar opens or
// closes. The upstream dsh does not expose these variables; we
// compute them once via ResizeObserver and re-publish on every change.
function watchFrameColumns() {
  if (typeof document === "undefined") return;
  // The frame element exposes its column widths via the grid-template-columns
  // inline style ("280px 1fr 500px"). Parse and publish the numbers.
  // Handle the minmax(a, b) form: collapse to its second argument.
  const publish = () => {
    const frame = document.querySelector("[data-dsh-frame]");
    if (!frame) return;
    const style = frame.getAttribute("style") || "";
    const m = style.match(/grid-template-columns:\s*([^;]+)/);
    if (!m) return;
    const parts = m[1].trim().replace(/minmax\([^,]+,\s*([^)]+)\)/g, "$1").split(/\s+/);
    if (parts.length >= 3) {
      const sidebar = parseFloat(parts[0]) || 0;
      const rightbar = parseFloat(parts[2]) || 0;
      document.documentElement.style.setProperty("--dsw-frame-sidebar-width", `${sidebar}px`);
      document.documentElement.style.setProperty("--dsw-frame-rightbar-width", `${rightbar}px`);
    }
  };
  // Run once now, and keep retrying until the frame element is mounted.
  // The dsh host renders the AppFrame asynchronously after the bundle
  // load, so a single check might miss it on the first script pass.
  publish();
  let attempts = 0;
  const retryUntilFrame = () => {
    if (attempts++ > 60) return; // ~3s at 50ms
    if (document.querySelector("[data-dsh-frame]")) {
      publish();
      // Watch the inline style for changes (rightbar toggle / drag).
      const observer = new MutationObserver(publish);
      observer.observe(document.querySelector("[data-dsh-frame]"), {
        attributes: true,
        attributeFilter: ["style"],
      });
    } else {
      setTimeout(retryUntilFrame, 50);
    }
  };
  setTimeout(retryUntilFrame, 0);
}

function apply() {
  injectStyles();
  watchFrameColumns();
}

function inject() {
  // No server-side hooks needed; all work is client-side.
  return {};
}

// CommonJS export — picked up by the cordis loader via await import()
// (Node ESM dynamic-import wraps CommonJS modules with default = module.exports,
// then unwrapExports() unwraps that).
//
// In the plain-script bundle context, this also works: the bundle
// concatenator's plain module object is exposed to the script,
// and any exports.X = X assignment is preserved.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { apply, inject };
  module.exports.apply = apply;
  module.exports.inject = inject;
}

// The browser-side path: __ModuleLoader__ exists after the dsh
// client-modules script has set up the module registry. Register our
// plugin there so the host treats this file as a registered client.
// Guarded so we don't crash in Node (where window is undefined).
//
// Two concerns need separate paths:
//   1. CSS injection. We can do this immediately if document is ready;
//      the dsh host will not re-call us for CSS refreshes.
//   2. Column-width watcher. We need this every time the right
//      sidebar opens/closes, so it must be a live ResizeObserver
//      that survives the page's normal Cordis lifecycle.
// We try __ModuleLoader__.load first (so the host sees us as a
// registered client), and if that is not yet available we run both
// side-effects directly — the script runs after the dsh boot
// preload either way.
function bootBrowser() {
  injectStyles();
  watchFrameColumns();
}

if (typeof window !== "undefined") {
  // Run the browser side-effects immediately, regardless of whether
  // __ModuleLoader__ is ready. The dsh host's batch concatenator
  // may load this file before the loader sets up, so the
  // __ModuleLoader__-gated branch isn't a reliable hook. The
  // CSS injection is idempotent (data-plugin-css check above) and
  // the ResizeObserver only runs once per page load.
  bootBrowser();

  // Also register with the ModuleLoader so the host treats this file
  // as a registered client (required for the host's lifecycle
  // tracking). The factory's body may never run in this dsh version,
  // but registering has no side effect.
  if (window.__ModuleLoader__) {
    window.__ModuleLoader__.load({
      id: "dsh-composer-fix",
      factory: () => {
        // No-op: bootBrowser already ran. Just satisfy the contract.
        return { apply, inject };
      },
    });
  }
}
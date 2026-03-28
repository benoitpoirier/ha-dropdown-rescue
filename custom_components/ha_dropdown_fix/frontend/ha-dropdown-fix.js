/*
 * HA Dropdown Fix
 *
 * Fixes menus/dropdowns that render below neighboring content by:
 * - Raising menu stacking context and enabling pointer-events
 * - Optionally relaxing clipping containers that cut menu overlays
 * - Injecting styles in both document and discovered shadow roots
 */

(() => {
  const scriptUrl = new URL(import.meta.url);
  const zIndex = Number.parseInt(scriptUrl.searchParams.get("z") || "2147483647", 10);
  const fixOverflow = scriptUrl.searchParams.get("overflow") !== "0";
  const scanShadowDom = scriptUrl.searchParams.get("shadow") !== "0";
  const debugOutline = scriptUrl.searchParams.get("debug") === "1";
  const extraSelectorsRaw = scriptUrl.searchParams.get("extra") || "";

  const extraSelectors = extraSelectorsRaw
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);

  const baseMenuSelectors = [
    "ha-dropdown[open]",
    ".mdc-menu-surface--open",
    "wa-popup[active]",
    "div#menu",
    "[part='menu']",
    ".ha-dropdown-menu",
    "ha-dropdown-item"
  ];

  const menuSelector = [...baseMenuSelectors, ...extraSelectors].join(",\n");

  const overflowSelectors = [
    ".mdc-data-table__row",
    ".mdc-data-table__cell",
    "lit-virtualizer",
    "ha-automation-list",
    "ha-script-list"
  ].join(",\n");

  const styleContent = `
${menuSelector} {
  z-index: ${zIndex} !important;
  pointer-events: auto !important;
  visibility: visible !important;
}

ha-dropdown[open] [part='menu'],
.mdc-menu-surface--open {
  background: var(--card-background-color, var(--ha-card-background, #fff)) !important;
  color: var(--primary-text-color, inherit) !important;
}

${
  fixOverflow
    ? `${overflowSelectors} {
  overflow: visible !important;
  contain: none !important;
}

.mdc-data-table__row:focus-within,
.mdc-data-table__row:hover {
  z-index: ${Math.max(1000, Math.min(zIndex, 100000))} !important;
}`
    : ""
}

${
  debugOutline
    ? `${menuSelector} {
  outline: 2px solid #00b050 !important;
}`
    : ""
}
`;

  const installedRoots = new WeakSet();

  const ensureStyle = (root) => {
    if (!root || installedRoots.has(root)) {
      return;
    }

    const styleId = "ha-dropdown-fix-style";

    if (root.querySelector && root.querySelector(`#${styleId}`)) {
      installedRoots.add(root);
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = styleContent;

    if (root === document) {
      document.head.appendChild(style);
      installedRoots.add(root);
      return;
    }

    root.appendChild(style);
    installedRoots.add(root);
  };

  const walkNodeForShadowRoots = (node) => {
    if (!scanShadowDom || !node || !(node instanceof Element)) {
      return;
    }

    if (node.shadowRoot) {
      ensureStyle(node.shadowRoot);
    }

    for (const child of node.children) {
      walkNodeForShadowRoots(child);
    }
  };

  const patchAttachShadow = () => {
    if (!scanShadowDom || Element.prototype.__haDropdownFixAttachShadowPatched) {
      return;
    }

    const originalAttachShadow = Element.prototype.attachShadow;

    Element.prototype.attachShadow = function attachShadowPatched(init) {
      const shadowRoot = originalAttachShadow.call(this, init);
      queueMicrotask(() => ensureStyle(shadowRoot));
      return shadowRoot;
    };

    Element.prototype.__haDropdownFixAttachShadowPatched = true;
  };

  ensureStyle(document);
  patchAttachShadow();
  walkNodeForShadowRoots(document.body);

  if (scanShadowDom) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          walkNodeForShadowRoots(node);
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
})();

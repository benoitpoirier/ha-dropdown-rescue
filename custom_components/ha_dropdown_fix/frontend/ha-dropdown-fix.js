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
  const autoIosTargeting = scriptUrl.searchParams.get("iosauto") !== "0";
  const extraSelectorsRaw = scriptUrl.searchParams.get("extra") || "";
  const ua = navigator.userAgent || "";
  const isIOS = /iP(hone|ad|od)/i.test(ua);
  const isLegacyIOS = isIOS && /OS (15|16)_/i.test(ua);
  const aggressiveMode =
    (autoIosTargeting && isLegacyIOS) || scriptUrl.searchParams.get("aggressive") === "1";

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
  const activeMenuSelector = [
    "ha-dropdown[open]",
    "ha-dropdown[open] [part='menu']",
    ".mdc-menu-surface--open",
    "wa-popup[active]",
    "div#menu",
    ".ha-dropdown-menu"
  ].join(",");

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
  position: relative !important;
  pointer-events: auto !important;
  visibility: visible !important;
  opacity: 1 !important;
}

ha-dropdown[open] [part='menu'],
.mdc-menu-surface--open {
  background: #6b0000 !important;
  color: #ffffff !important;
  z-index: ${zIndex} !important;
}

ha-dropdown-item,
.mdc-list-item,
[role='menuitem'] {
  color: #ffffff !important;
}

:root {
  --wa-z-index-dropdown: ${zIndex};
  --wa-z-index-popover: ${zIndex};
}

${
  aggressiveMode
    ? `
/* iOS 15/16: remove common clipping and stacking constraints */
home-assistant,
home-assistant-main,
ha-app-layout,
app-drawer-layout,
ha-panel-lovelace,
hui-root,
ha-config-section,
ha-config-dashboard {
  overflow: visible !important;
}
`
    : ""
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
  const elevatedElements = new WeakSet();

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

  const getParentElement = (node) => {
    if (!node) {
      return null;
    }

    if (node.parentElement) {
      return node.parentElement;
    }

    const root = node.getRootNode ? node.getRootNode() : null;
    if (root && root instanceof ShadowRoot) {
      return root.host;
    }

    return null;
  };

  const elevateForMenu = (menuElement) => {
    if (!(menuElement instanceof HTMLElement)) {
      return;
    }

    menuElement.style.setProperty("z-index", String(zIndex), "important");
    menuElement.style.setProperty("pointer-events", "auto", "important");
    menuElement.style.setProperty("visibility", "visible", "important");
    menuElement.style.setProperty("opacity", "1", "important");

    if (aggressiveMode) {
      menuElement.style.setProperty("position", "fixed", "important");
    }

    let current = menuElement;
    let depth = 0;

    while (current && depth < 16) {
      if (current instanceof HTMLElement && !elevatedElements.has(current)) {
        current.style.setProperty("z-index", String(Math.max(zIndex - depth, 1000)), "important");
        current.style.setProperty("isolation", "isolate", "important");

        if (fixOverflow) {
          current.style.setProperty("overflow", "visible", "important");
          current.style.setProperty("contain", "none", "important");
        }

        if (aggressiveMode) {
          const computed = window.getComputedStyle(current);
          if (computed.transform !== "none") {
            current.style.setProperty("transform", "none", "important");
          }
          if (computed.filter !== "none") {
            current.style.setProperty("filter", "none", "important");
          }
          if (computed.perspective !== "none") {
            current.style.setProperty("perspective", "none", "important");
          }
          if (computed.backdropFilter !== "none") {
            current.style.setProperty("backdrop-filter", "none", "important");
            current.style.setProperty("-webkit-backdrop-filter", "none", "important");
          }
        }

        elevatedElements.add(current);
      }

      current = getParentElement(current);
      depth += 1;
    }
  };

  const promoteOpenMenus = () => {
    const openMenus = document.querySelectorAll(activeMenuSelector);
    for (const menu of openMenus) {
      elevateForMenu(menu);
    }
  };

  let scheduled = false;
  const schedulePromote = () => {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      promoteOpenMenus();
    });
  };

  ensureStyle(document);
  patchAttachShadow();
  walkNodeForShadowRoots(document.body);
  schedulePromote();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (scanShadowDom) {
        for (const node of mutation.addedNodes) {
          walkNodeForShadowRoots(node);
        }
      }

      if (mutation.type === "attributes") {
        schedulePromote();
      }

      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        schedulePromote();
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["open", "active", "class", "style"]
  });

  document.addEventListener("click", schedulePromote, true);
  document.addEventListener("pointerdown", schedulePromote, true);
  window.addEventListener("resize", schedulePromote, { passive: true });
  window.addEventListener("orientationchange", schedulePromote, { passive: true });
})();

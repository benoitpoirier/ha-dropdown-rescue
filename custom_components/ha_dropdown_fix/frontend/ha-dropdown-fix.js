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
  const autoLegacyFallback = scriptUrl.searchParams.get("legacyfallback") !== "0";
  const extraSelectorsRaw = scriptUrl.searchParams.get("extra") || "";
  const supportsPopoverMethods =
    typeof HTMLElement !== "undefined" &&
    "showPopover" in HTMLElement.prototype &&
    "hidePopover" in HTMLElement.prototype;
  const supportsPopoverSelector =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("selector(:popover-open)");
  const hasReliablePopoverTopLayer = supportsPopoverMethods && supportsPopoverSelector;
  const legacyPopoverFallback = autoLegacyFallback && !hasReliablePopoverTopLayer;
  const aggressiveMode =
    legacyPopoverFallback || scriptUrl.searchParams.get("aggressive") === "1";

  console.info("[ha-dropdown-fix] popover decision", {
    autoLegacyFallback,
    supportsPopoverMethods,
    supportsPopoverSelector,
    hasReliablePopoverTopLayer,
    legacyPopoverFallback,
    aggressiveMode
  });

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
    "wa-popup[active] [part='popup']",
    "div#menu",
    ".ha-dropdown-menu",
    "[part='popup']",
    ".popup"
  ].join(",");

  const promotedContainerSelector = [
    ".content",
    "hui-section",
    "ha-card",
    "hui-card",
    "hui-grid-section",
    ".card",
    ".section",
    "ha-control-select-menu",
    "ha-select"
  ].join(",");

  const blockedPromotionSelector = [
    "home-assistant",
    "home-assistant-main",
    "ha-app-layout",
    "app-drawer-layout",
    "ha-sidebar"
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
.mdc-menu-surface--open,
div#menu,
[part='menu'],
[part='popup'],
.popup,
wa-popup[active] [part='popup'] {
  z-index: ${zIndex} !important;
}

:root {
  --wa-z-index-dropdown: ${zIndex};
  --wa-z-index-popover: ${zIndex};
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
    ? `${menuSelector},
${activeMenuSelector} {
  background: #6b0000 !important;
  color: #ffffff !important;
}`
    : ""
}
`;

  const installedRoots = new WeakSet();
  const styledRoots = new Set([document]);
  const managedStyles = new Map();

  const applyManagedStyle = (element, property, value, priority = "important") => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    let propertyMap = managedStyles.get(element);
    if (!propertyMap) {
      propertyMap = new Map();
      managedStyles.set(element, propertyMap);
    }

    if (!propertyMap.has(property)) {
      propertyMap.set(property, {
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property)
      });
    }

    element.style.setProperty(property, value, priority);
  };

  const restoreManagedStyles = () => {
    for (const [element, propertyMap] of managedStyles) {
      for (const [property, previous] of propertyMap) {
        if (previous.value) {
          element.style.setProperty(property, previous.value, previous.priority || "");
        } else {
          element.style.removeProperty(property);
        }
      }
    }

    managedStyles.clear();
  };

  const collectMatchesAcrossRoots = (selector, roots = styledRoots) => {
    const results = new Set();
    for (const root of roots) {
      if (!root || !root.querySelectorAll) {
        continue;
      }

      for (const match of root.querySelectorAll(selector)) {
        results.add(match);
      }
    }

    return results;
  };

  const demoteCompetingLayers = () => {
    if (!legacyPopoverFallback) {
      return;
    }

    const candidates = collectMatchesAcrossRoots(".search");
    for (const layer of candidates) {
      if (!(layer instanceof HTMLElement)) {
        continue;
      }

      applyManagedStyle(layer, "z-index", "10");
      applyManagedStyle(layer, "isolation", "auto");
      applyManagedStyle(layer, "contain", "none");
      applyManagedStyle(layer, "backdrop-filter", "none");
      applyManagedStyle(layer, "-webkit-backdrop-filter", "none");
    }
  };

  const ensureStyle = (root) => {
    if (!root || installedRoots.has(root)) {
      return;
    }

    const styleId = "ha-dropdown-fix-style";

    if (root.querySelector && root.querySelector(`#${styleId}`)) {
      installedRoots.add(root);
      styledRoots.add(root);
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
    styledRoots.add(root);
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

    applyManagedStyle(menuElement, "z-index", String(zIndex));
    applyManagedStyle(menuElement, "pointer-events", "auto");
    applyManagedStyle(menuElement, "visibility", "visible");
    applyManagedStyle(menuElement, "opacity", "1");
    applyManagedStyle(menuElement, "isolation", "isolate");

    let current = menuElement;
    let depth = 0;
    const visited = new Set();

    while (current && depth < 20) {
      if (current instanceof HTMLElement && !visited.has(current)) {
        visited.add(current);

        if (current.matches(blockedPromotionSelector)) {
          current = getParentElement(current);
          depth += 1;
          continue;
        }

        const isPromotedContainer = current.matches(promotedContainerSelector);
        const shouldPromoteNode = depth <= 1 || isPromotedContainer;

        if (shouldPromoteNode) {
          applyManagedStyle(current, "z-index", String(Math.max(zIndex - depth, 1000)));
        }

        if (isPromotedContainer) {
          applyManagedStyle(current, "position", "relative");
          applyManagedStyle(current, "isolation", "isolate");
        }

        if (fixOverflow && shouldPromoteNode) {
          applyManagedStyle(current, "overflow", "visible");
          applyManagedStyle(current, "contain", "none");
        }

        if (aggressiveMode && shouldPromoteNode) {
          const computed = window.getComputedStyle(current);
          const canResetCompositeEffects = depth > 0;

          if (canResetCompositeEffects && computed.transform !== "none") {
            applyManagedStyle(current, "transform", "none");
          }
          if (canResetCompositeEffects && computed.filter !== "none") {
            applyManagedStyle(current, "filter", "none");
          }
          if (canResetCompositeEffects && computed.perspective !== "none") {
            applyManagedStyle(current, "perspective", "none");
          }
          if (canResetCompositeEffects && computed.backdropFilter !== "none") {
            applyManagedStyle(current, "backdrop-filter", "none");
            applyManagedStyle(current, "-webkit-backdrop-filter", "none");
          }

          if (isPromotedContainer) {
            applyManagedStyle(current, "position", "relative");
          }
        }
      }

      current = getParentElement(current);
      depth += 1;
    }
  };

  const promoteOpenMenus = () => {
    restoreManagedStyles();

    const openMenus = new Set();

    for (const menu of collectMatchesAcrossRoots(activeMenuSelector)) {
      openMenus.add(menu);
    }

    if (openMenus.size === 0) {
      return;
    }

    demoteCompetingLayers();

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
    attributeFilter: ["open", "active"]
  });

  document.addEventListener("click", schedulePromote, true);
  document.addEventListener("pointerdown", schedulePromote, true);
  window.addEventListener("resize", schedulePromote, { passive: true });
  window.addEventListener("orientationchange", schedulePromote, { passive: true });
})();

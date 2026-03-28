# HA Dropdown Fix (HACS)

Community fix for Home Assistant, based on frontend issue
[#29172](https://github.com/home-assistant/frontend/issues/29172), where
ha-dropdown menus can become transparent and non-clickable due to focus and stacking context issues.

Official repository: https://github.com/benoitpoirier/ha-dropdown-rescue

## Goals

- Fix three-dot menus and other inactive dropdowns in the UI.
- Provide simple installation through HACS in the Integration category.
- Allow quick configuration through configuration.yaml.
- Keep the project ready for submission to the official HACS default repository list.

## What this fix does

- Injects a global frontend module using frontend.add_extra_js_url.
- Enforces proper visual and click priority for open menus.
- Optionally relaxes clipping containers that cut overlays (overflow and contain).
- Injects styles into detected Shadow DOM roots to cover affected UI areas.

## Installation

### 1. Add the repository in HACS

1. Open HACS and go to the three-dot menu, then Custom repositories.
2. Add this repository URL: https://github.com/benoitpoirier/ha-dropdown-rescue
3. Select category: Integration.
4. Install HA Dropdown Fix.

### 2. Configure Home Assistant

Add this in configuration.yaml:

```yaml
ha_dropdown_fix:
  enabled: true
  z_index: 2147483647
  fix_overflow: true
  scan_shadow_dom: true
  debug_outline: false
  auto_legacy_fallback: true
  aggressive_mode: false
  extra_menu_selectors: []
```

Then restart Home Assistant.

## Configuration

Available options under ha_dropdown_fix:

- enabled (bool, default: true): enable or disable the patch.
- z_index (int, default: 2147483647): visual priority for menus.
- fix_overflow (bool, default: true): relax blocking overflow and contain contexts.
- scan_shadow_dom (bool, default: true): apply styles in detected Shadow DOM roots.
- debug_outline (bool, default: false): show a debug outline around patched menus.
- auto_legacy_fallback (bool, default: true): automatically enable stronger fallback behavior on browsers that do not support the Popover API.
- aggressive_mode (bool, default: false): force stronger compositing and clipping fixes regardless of browser capability detection.
- extra_menu_selectors (list[str], default: []): additional CSS selectors to force.

Advanced example:

```yaml
ha_dropdown_fix:
  z_index: 999999
  fix_overflow: true
  extra_menu_selectors:
    - "ha-selector-menu"
    - ".my-custom-dropdown"
```

## Project structure

- custom_components/ha_dropdown_fix/__init__.py: integration setup and module injection.
- custom_components/ha_dropdown_fix/frontend/ha-dropdown-fix.js: runtime JS and CSS fix.
- custom_components/ha_dropdown_fix/manifest.json: Home Assistant metadata.
- hacs.json: HACS metadata.
- .github/workflows/validate.yml: HACS and Hassfest validation workflows.

## Best practices included

- Lightweight integration with no external runtime dependencies.
- Configuration validated with voluptuous.
- Conditional loading with easy tuning options.
- CI validation workflow to keep quality before publication.

## Browser compatibility analysis (iOS 15/16)

Result of the compatibility deep-dive performed on real snapshots and browser support data:

- Home Assistant uses popup markup based on `popover="manual"` in several dropdown surfaces.
- Safari iOS 15 and 16 do not provide full Popover API support (no reliable top-layer behavior).
- In failing views, `.search` combines `position: sticky`, very high `z-index`, and `isolation`, creating an independent stacking context.
- HA theme styles often use `backdrop-filter`, which increases compositing complexity on older WebKit versions.
- Therefore, a pure `z-index` increase on dropdown items is not always enough on iOS 15/16.

What changed because of this analysis in v0.1.7:

- Replaced iOS User-Agent targeting with capability detection based on Popover API support.
- Added a legacy fallback path that temporarily demotes competing `.search` layer styling while a menu is open.
- Kept all style promotions reversible to avoid persistent side effects after menu close.
- Removed temporary diagnostic color forcing that is no longer necessary.

## Official HACS publication

Recommended prerequisites:

1. Use a public GitHub repository.
2. Fill documentation, issue_tracker and codeowners in manifest.json for your repository.
3. Publish semantic releases such as v0.1.0 and v0.1.1.
4. Ensure HACS and Hassfest checks pass on the default branch.
5. Submit the repository through the official HACS process.

Current repository status:

- manifest.json metadata configured for GitHub.
- v0.1.0, v0.1.1, v0.1.2, v0.1.3, v0.1.4, v0.1.5, v0.1.6 and v0.1.7 tags/releases published.
- HACS and Hassfest validation workflow in place.

## Known limitations

- The original issue is in Home Assistant frontend. This project provides a runtime workaround.
- If upstream frontend structure changes significantly, extra_menu_selectors may need to be adjusted.

## Contribution

Pull requests are welcome to expand coverage for affected menus in automations, scripts, dashboards, blueprints and related areas.

"""Inject a frontend patch that fixes non-clickable Home Assistant dropdown menus."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import urlencode

import voluptuous as vol

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.const import CONF_URL
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import (
    CONF_AGGRESSIVE_MODE,
    CONF_AUTO_LEGACY_FALLBACK,
    CONF_DEBUG_OUTLINE,
    CONF_ENABLE_PATCH_OLD_IOS,
    CONF_ENABLE_PATCH_OLD_IOS_LOWER,
    CONF_ENABLE_PATCH_WINDOWS_OLD_BROWSERS,
    CONF_ENABLED,
    CONF_EXTRA_MENU_SELECTORS,
    CONF_FIX_OVERFLOW,
    CONF_SCAN_SHADOW_DOM,
    CONF_WINDOWS_CHROMIUM_MAX,
    CONF_WINDOWS_FIREFOX_MAX,
    CONF_Z_INDEX,
    DEFAULT_AGGRESSIVE_MODE,
    DEFAULT_AUTO_LEGACY_FALLBACK,
    DEFAULT_DEBUG_OUTLINE,
    DEFAULT_ENABLE_PATCH_OLD_IOS,
    DEFAULT_ENABLE_PATCH_WINDOWS_OLD_BROWSERS,
    DEFAULT_ENABLED,
    DEFAULT_EXTRA_MENU_SELECTORS,
    DEFAULT_FIX_OVERFLOW,
    DEFAULT_SCAN_SHADOW_DOM,
    DEFAULT_WINDOWS_CHROMIUM_MAX,
    DEFAULT_WINDOWS_FIREFOX_MAX,
    DEFAULT_Z_INDEX,
    DOMAIN,
    STATIC_MODULE_URL,
    VERSION,
)

CONFIG_SCHEMA = vol.Schema(
    {
        DOMAIN: vol.Schema(
            {
                vol.Optional(CONF_ENABLED, default=DEFAULT_ENABLED): cv.boolean,
                vol.Optional(CONF_Z_INDEX, default=DEFAULT_Z_INDEX): vol.All(
                    vol.Coerce(int), vol.Range(min=1)
                ),
                vol.Optional(
                    CONF_FIX_OVERFLOW, default=DEFAULT_FIX_OVERFLOW
                ): cv.boolean,
                vol.Optional(
                    CONF_SCAN_SHADOW_DOM, default=DEFAULT_SCAN_SHADOW_DOM
                ): cv.boolean,
                vol.Optional(
                    CONF_DEBUG_OUTLINE, default=DEFAULT_DEBUG_OUTLINE
                ): cv.boolean,
                vol.Optional(
                    CONF_AGGRESSIVE_MODE, default=DEFAULT_AGGRESSIVE_MODE
                ): cv.boolean,
                vol.Optional(
                    CONF_AUTO_LEGACY_FALLBACK,
                    default=DEFAULT_AUTO_LEGACY_FALLBACK,
                ): cv.boolean,
                vol.Optional(
                    CONF_ENABLE_PATCH_OLD_IOS,
                    default=DEFAULT_ENABLE_PATCH_OLD_IOS,
                ): cv.boolean,
                vol.Optional(
                    CONF_ENABLE_PATCH_OLD_IOS_LOWER,
                    default=DEFAULT_ENABLE_PATCH_OLD_IOS,
                ): cv.boolean,
                vol.Optional(
                    CONF_ENABLE_PATCH_WINDOWS_OLD_BROWSERS,
                    default=DEFAULT_ENABLE_PATCH_WINDOWS_OLD_BROWSERS,
                ): cv.boolean,
                vol.Optional(
                    CONF_WINDOWS_FIREFOX_MAX,
                    default=DEFAULT_WINDOWS_FIREFOX_MAX,
                ): vol.All(vol.Coerce(int), vol.Range(min=1)),
                vol.Optional(
                    CONF_WINDOWS_CHROMIUM_MAX,
                    default=DEFAULT_WINDOWS_CHROMIUM_MAX,
                ): vol.All(vol.Coerce(int), vol.Range(min=1)),
                vol.Optional(
                    CONF_EXTRA_MENU_SELECTORS,
                    default=DEFAULT_EXTRA_MENU_SELECTORS,
                ): vol.All(cv.ensure_list, [cv.string]),
            }
        )
    },
    extra=vol.ALLOW_EXTRA,
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the HA Dropdown Fix integration from YAML."""
    integration_config = config.get(DOMAIN)
    if not integration_config:
        return True

    if not integration_config[CONF_ENABLED]:
        return True

    module_file = Path(__file__).parent / "frontend" / "ha-dropdown-fix.js"
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                STATIC_MODULE_URL,
                str(module_file),
                cache_headers=False,
            )
        ]
    )

    enable_patch_old_ios = bool(
        integration_config[CONF_ENABLE_PATCH_OLD_IOS]
        or integration_config[CONF_ENABLE_PATCH_OLD_IOS_LOWER]
    )
    enable_patch_windows_old_browsers = bool(
        integration_config[CONF_ENABLE_PATCH_WINDOWS_OLD_BROWSERS]
    )

    params = {
        "v": VERSION,
        "z": str(integration_config[CONF_Z_INDEX]),
        "overflow": "1" if integration_config[CONF_FIX_OVERFLOW] else "0",
        "shadow": "1" if integration_config[CONF_SCAN_SHADOW_DOM] else "0",
        "debug": "1" if integration_config[CONF_DEBUG_OUTLINE] else "0",
        "aggressive": "1" if integration_config[CONF_AGGRESSIVE_MODE] else "0",
        "legacyfallback": "1"
        if integration_config[CONF_AUTO_LEGACY_FALLBACK]
        else "0",
        "epios": "1" if enable_patch_old_ios else "0",
        "epwob": "1" if enable_patch_windows_old_browsers else "0",
        "wfmax": str(integration_config[CONF_WINDOWS_FIREFOX_MAX]),
        "wcmax": str(integration_config[CONF_WINDOWS_CHROMIUM_MAX]),
    }

    extra_selectors = integration_config[CONF_EXTRA_MENU_SELECTORS]
    if extra_selectors:
        params["extra"] = "|".join(extra_selectors)

    module_url = f"{STATIC_MODULE_URL}?{urlencode(params)}"
    frontend.add_extra_js_url(hass, module_url)

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][CONF_URL] = module_url

    return True

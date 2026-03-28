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
    CONF_ENABLED,
    CONF_EXTRA_MENU_SELECTORS,
    CONF_FIX_OVERFLOW,
    CONF_SCAN_SHADOW_DOM,
    CONF_Z_INDEX,
    DEFAULT_AGGRESSIVE_MODE,
    DEFAULT_AUTO_LEGACY_FALLBACK,
    DEFAULT_DEBUG_OUTLINE,
    DEFAULT_ENABLED,
    DEFAULT_EXTRA_MENU_SELECTORS,
    DEFAULT_FIX_OVERFLOW,
    DEFAULT_SCAN_SHADOW_DOM,
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
    }

    extra_selectors = integration_config[CONF_EXTRA_MENU_SELECTORS]
    if extra_selectors:
        params["extra"] = "|".join(extra_selectors)

    module_url = f"{STATIC_MODULE_URL}?{urlencode(params)}"
    frontend.add_extra_js_url(hass, module_url)

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][CONF_URL] = module_url

    return True

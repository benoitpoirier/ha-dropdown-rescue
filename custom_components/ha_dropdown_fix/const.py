"""Constants for the HA Dropdown Fix integration."""

DOMAIN = "ha_dropdown_fix"
VERSION = "0.1.2"

CONF_ENABLED = "enabled"
CONF_Z_INDEX = "z_index"
CONF_FIX_OVERFLOW = "fix_overflow"
CONF_SCAN_SHADOW_DOM = "scan_shadow_dom"
CONF_DEBUG_OUTLINE = "debug_outline"
CONF_AGGRESSIVE_MODE = "aggressive_mode"
CONF_AUTO_IOS_TARGETING = "auto_ios_targeting"
CONF_EXTRA_MENU_SELECTORS = "extra_menu_selectors"

DEFAULT_ENABLED = True
DEFAULT_Z_INDEX = 2_147_483_647
DEFAULT_FIX_OVERFLOW = True
DEFAULT_SCAN_SHADOW_DOM = True
DEFAULT_DEBUG_OUTLINE = False
DEFAULT_AGGRESSIVE_MODE = False
DEFAULT_AUTO_IOS_TARGETING = True
DEFAULT_EXTRA_MENU_SELECTORS: list[str] = []

STATIC_MODULE_URL = "/ha_dropdown_fix/ha-dropdown-fix.js"

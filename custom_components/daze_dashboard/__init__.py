"""DAZE Dashboard integration."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.panel_custom import async_register_panel
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .api import async_register_websocket_api
from .const import (
    DOMAIN,
    FRONTEND_FILE,
    PANEL_COMPONENT,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL,
    STATIC_URL,
)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up DAZE Dashboard from a config entry."""
    if not hass.data.get(f"{DOMAIN}_websocket_registered"):
        async_register_websocket_api(hass)
        hass.data[f"{DOMAIN}_websocket_registered"] = True

    frontend_dir = Path(__file__).parent / "frontend"

    if not hass.data.get(f"{DOMAIN}_static_registered"):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    STATIC_URL,
                    str(frontend_dir),
                    False,
                )
            ]
        )
        hass.data[f"{DOMAIN}_static_registered"] = True

    if not hass.data.get(f"{DOMAIN}_panel_registered"):
        await async_register_panel(
            hass,
            frontend_url_path=PANEL_URL,
            webcomponent_name=PANEL_COMPONENT,
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            module_url=f"{STATIC_URL}/{FRONTEND_FILE}?v=1.1.0",
            require_admin=False,
            config={"version": "1.1.0"},
        )
        hass.data[f"{DOMAIN}_panel_registered"] = True

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {}
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload DAZE Dashboard."""
    hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)

    if not hass.data.get(DOMAIN):
        frontend.async_remove_panel(hass, PANEL_URL, warn_if_unknown=False)
        hass.data[f"{DOMAIN}_panel_registered"] = False

    return True

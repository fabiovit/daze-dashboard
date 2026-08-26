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
    VERSION,
)

_DATA_WEBSOCKET_REGISTERED = f"{DOMAIN}_websocket_registered"
_DATA_STATIC_REGISTERED = f"{DOMAIN}_static_registered"
_DATA_PANEL_REGISTERED = f"{DOMAIN}_panel_registered"


def _register_websocket_once(hass: HomeAssistant) -> None:
    """Register the dashboard WebSocket API once per Home Assistant runtime."""
    if hass.data.get(_DATA_WEBSOCKET_REGISTERED):
        return

    async_register_websocket_api(hass)
    hass.data[_DATA_WEBSOCKET_REGISTERED] = True


async def _register_frontend_once(hass: HomeAssistant) -> None:
    """Register static frontend assets once per Home Assistant runtime."""
    if hass.data.get(_DATA_STATIC_REGISTERED):
        return

    frontend_dir = Path(__file__).parent / "frontend"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(frontend_dir), False)]
    )
    hass.data[_DATA_STATIC_REGISTERED] = True


async def _register_panel_once(hass: HomeAssistant) -> None:
    """Register the Home Assistant sidebar panel once."""
    if hass.data.get(_DATA_PANEL_REGISTERED):
        return

    await async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name=PANEL_COMPONENT,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=f"{STATIC_URL}/{FRONTEND_FILE}?v={VERSION}",
        require_admin=False,
        config={"version": VERSION},
    )
    hass.data[_DATA_PANEL_REGISTERED] = True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up DAZE Dashboard from a config entry."""
    _register_websocket_once(hass)
    await _register_frontend_once(hass)
    await _register_panel_once(hass)

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {}
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload DAZE Dashboard."""
    hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)

    if not hass.data.get(DOMAIN):
        frontend.async_remove_panel(hass, PANEL_URL, warn_if_unknown=False)
        hass.data[_DATA_PANEL_REGISTERED] = False

    return True

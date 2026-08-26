"""WebSocket API for DAZE Dashboard."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event

from .const import (
    DEFAULT_SHOW_CHART,
    DEFAULT_SHOW_DIAGNOSTICS,
    DEFAULT_SHOW_SESSION_STATS,
    DEFAULT_THEME,
    DOMAIN,
    OPTION_SHOW_CHART,
    OPTION_SHOW_DIAGNOSTICS,
    OPTION_SHOW_SESSION_STATS,
    OPTION_THEME,
)
from .entity_map import DazeEntityMap, discover_daze_entities


def _dashboard_options(hass: HomeAssistant) -> dict[str, Any]:
    """Return UI options from the single DAZE Dashboard config entry."""
    entries = hass.config_entries.async_entries(DOMAIN)
    options = entries[0].options if entries else {}

    return {
        "show_chart": options.get(OPTION_SHOW_CHART, DEFAULT_SHOW_CHART),
        "show_diagnostics": options.get(
            OPTION_SHOW_DIAGNOSTICS,
            DEFAULT_SHOW_DIAGNOSTICS,
        ),
        "show_session_stats": options.get(
            OPTION_SHOW_SESSION_STATS,
            DEFAULT_SHOW_SESSION_STATS,
        ),
        "theme": options.get(OPTION_THEME, DEFAULT_THEME),
    }


def _state_payload(hass: HomeAssistant, entity_map: DazeEntityMap) -> dict[str, Any]:
    """Build privacy-safe logical data for the frontend."""
    values: dict[str, Any] = {}

    for logical_key, entity_id in entity_map.entities.items():
        state = hass.states.get(entity_id)
        if state is None:
            values[logical_key] = None
            continue

        values[logical_key] = {
            "state": state.state,
            "unit": state.attributes.get("unit_of_measurement"),
            "available": state.state not in ("unknown", "unavailable"),
        }

        if logical_key == "tariff":
            values[logical_key]["currency_symbol"] = state.attributes.get(
                "currency_symbol"
            )
            values[logical_key]["currency_code"] = state.attributes.get(
                "currency_code"
            )

    return {
        "available": bool(entity_map.entities),
        "integration": "ha-daze",
        "values": values,
        "options": _dashboard_options(hass),
    }


@websocket_api.websocket_command(
    {
        vol.Required("type"): "daze_dashboard/subscribe",
    }
)
@websocket_api.async_response
async def websocket_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe the frontend to relevant DAZE state changes."""
    entity_map = discover_daze_entities(hass)

    @callback
    def send_update(*_: Any) -> None:
        connection.send_event(msg["id"], _state_payload(hass, entity_map))

    connection.send_result(msg["id"])

    if entity_map.entity_ids:
        unsubscribe = async_track_state_change_event(
            hass,
            entity_map.entity_ids,
            send_update,
        )
        connection.subscriptions[msg["id"]] = unsubscribe

    send_update()


def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register DAZE Dashboard WebSocket commands."""
    websocket_api.async_register_command(hass, websocket_subscribe)

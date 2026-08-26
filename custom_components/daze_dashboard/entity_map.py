"""Runtime discovery of entities exposed by the ha-daze integration."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from .const import DAZE_PLATFORM

SOCKET_KEYS = (
    "power",
    "session_energy",
    "charging_current_l1",
    "charging_current_l2",
    "charging_current_l3",
    "voltage_l1",
    "voltage_l2",
    "voltage_l3",
    "board_temperature",
    "case_temperature",
    "max_charging_current",
    "status",
    "evse_state",
    "system_error",
    "fan_status",
)

EVSE_KEYS = (
    "wifi_ssid",
    "software_version",
    "firmware_version",
    "grid_current_l1",
    "grid_current_l2",
    "grid_current_l3",
)

NETWORK_KEYS = ("tariff",)
ALL_KEYS = SOCKET_KEYS + EVSE_KEYS + NETWORK_KEYS
GLOBAL_KEYS = EVSE_KEYS + NETWORK_KEYS


@dataclass(slots=True)
class DazeEntityMap:
    """Logical DAZE fields mapped to Home Assistant entity ids."""

    entities: dict[str, str]

    @property
    def entity_ids(self) -> list[str]:
        """Return unique discovered Home Assistant entity ids."""
        return list(dict.fromkeys(self.entities.values()))


def _key_from_unique_id(unique_id: str) -> str | None:
    """Extract a known ha-daze logical key from an entity unique id."""
    for key in sorted(ALL_KEYS, key=len, reverse=True):
        if unique_id == key or unique_id.endswith(f"_{key}"):
            return key
    return None


def _socket_base(unique_id: str, key: str) -> str:
    """Return the socket/device prefix associated with a logical key."""
    suffix = f"_{key}"
    return unique_id[: -len(suffix)] if unique_id.endswith(suffix) else unique_id


def _group_score(item: tuple[str, dict[str, str]]) -> tuple[int, int]:
    """Score a candidate socket group for automatic selection."""
    _, mapping = item
    preferred = int("evse_state" in mapping) + int("power" in mapping)
    return preferred, len(mapping)


def discover_daze_entities(hass: HomeAssistant) -> DazeEntityMap:
    """Discover ha-daze entities without relying on user-defined entity ids."""
    registry = er.async_get(hass)
    daze_entries = [
        entry for entry in registry.entities.values() if entry.platform == DAZE_PLATFORM
    ]

    grouped: dict[str, dict[str, str]] = {}
    global_matches: dict[str, list[str]] = {key: [] for key in GLOBAL_KEYS}

    for entry in daze_entries:
        key = _key_from_unique_id(entry.unique_id)
        if key is None:
            continue

        base = _socket_base(entry.unique_id, key)
        grouped.setdefault(base, {})[key] = entry.entity_id

        if key in global_matches:
            global_matches[key].append(entry.entity_id)

    if not grouped:
        return DazeEntityMap({})

    primary = max(grouped.items(), key=_group_score)[1]
    result = dict(primary)

    # EVSE/network diagnostics can use a different unique-id prefix.
    # Attach them only when the match is unambiguous.
    for key, matches in global_matches.items():
        if len(matches) == 1:
            result[key] = matches[0]

    return DazeEntityMap(result)

"""Runtime discovery of entities exposed by the ha-daze integration."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

DAZE_PLATFORM = "daze"

# Stable keys currently exposed by ha-daze in entity unique_ids.
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


@dataclass(slots=True)
class DazeEntityMap:
    """Logical DAZE fields mapped to Home Assistant entity_ids."""

    entities: dict[str, str]

    @property
    def entity_ids(self) -> list[str]:
        """Return the discovered Home Assistant entity ids."""
        return list(dict.fromkeys(self.entities.values()))


def _key_from_unique_id(unique_id: str) -> str | None:
    """Extract a known ha-daze key from an entity unique_id."""
    for key in sorted(ALL_KEYS, key=len, reverse=True):
        if unique_id == key or unique_id.endswith(f"_{key}"):
            return key
    return None


def discover_daze_entities(hass: HomeAssistant) -> DazeEntityMap:
    """Discover ha-daze entities using the entity registry, not entity_id names."""
    registry = er.async_get(hass)

    grouped: dict[str, dict[str, str]] = {}

    for entry in registry.entities.values():
        if entry.platform != DAZE_PLATFORM:
            continue

        key = _key_from_unique_id(entry.unique_id)
        if key is None:
            continue

        # Socket entities use "<socket_id>_<key>" unique ids. Grouping by the
        # prefix lets us select a coherent socket if multiple wallboxes/sockets
        # exist, without relying on user-defined entity names.
        suffix = f"_{key}"
        base = entry.unique_id[:-len(suffix)] if entry.unique_id.endswith(suffix) else entry.unique_id
        grouped.setdefault(base, {})[key] = entry.entity_id

    if not grouped:
        return DazeEntityMap({})

    # Prefer the group that contains an EVSE state and power sensor, then the
    # one with the most known telemetry fields.
    def score(item: tuple[str, dict[str, str]]) -> tuple[int, int]:
        _, mapping = item
        preferred = int("evse_state" in mapping) + int("power" in mapping)
        return preferred, len(mapping)

    primary_base, primary = max(grouped.items(), key=score)
    result = dict(primary)

    # EVSE- and network-level diagnostics have different unique-id prefixes.
    # Add them globally if there is exactly one matching entity for the field.
    for key in EVSE_KEYS + NETWORK_KEYS:
        matches: list[str] = []
        for entry in registry.entities.values():
            if entry.platform != DAZE_PLATFORM:
                continue
            if _key_from_unique_id(entry.unique_id) == key:
                matches.append(entry.entity_id)
        if len(matches) == 1:
            result[key] = matches[0]

    return DazeEntityMap(result)

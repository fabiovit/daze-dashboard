"""Config and options flow for DAZE Dashboard."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.config_entries import ConfigFlowResult, OptionsFlowWithReload
from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er

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

DAZE_PLATFORM = "daze"

OPTIONS_SCHEMA = vol.Schema(
    {
        vol.Optional(OPTION_SHOW_CHART, default=DEFAULT_SHOW_CHART): bool,
        vol.Optional(OPTION_SHOW_SESSION_STATS, default=DEFAULT_SHOW_SESSION_STATS): bool,
        vol.Optional(OPTION_SHOW_DIAGNOSTICS, default=DEFAULT_SHOW_DIAGNOSTICS): bool,
        vol.Optional(OPTION_THEME, default=DEFAULT_THEME): vol.In(["auto", "dark", "light"]),
    }
)


class DazeDashboardConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for DAZE Dashboard."""

    VERSION = 1

    async def async_step_user(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        """Handle the initial setup wizard."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        registry = er.async_get(self.hass)
        daze_entities = [
            entry for entry in registry.entities.values()
            if entry.platform == DAZE_PLATFORM
        ]

        if user_input is not None:
            return self.async_create_entry(title="DAZE Dashboard", data={})

        return self.async_show_form(
            step_id="user",
            data_schema=None,
            description_placeholders={
                "ha_daze_status": "Rilevato" if daze_entities else "Non rilevato",
                "entity_count": str(len(daze_entities)),
            },
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Return the options flow."""
        return DazeDashboardOptionsFlow()


class DazeDashboardOptionsFlow(OptionsFlowWithReload):
    """Manage DAZE Dashboard options."""

    async def async_step_init(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        """Manage dashboard options."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)

        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(
                OPTIONS_SCHEMA,
                self.config_entry.options,
            ),
        )

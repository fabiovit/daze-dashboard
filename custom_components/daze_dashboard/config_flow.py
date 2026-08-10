"""Config and options flow for DAZE Dashboard."""

from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback

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


class DazeDashboardConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for DAZE Dashboard."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        if user_input is not None:
            return self.async_create_entry(
                title="DAZE Dashboard",
                data={},
            )

        return self.async_show_form(
            step_id="user",
            data_schema=None,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Return the options flow."""
        return DazeDashboardOptionsFlow()


class DazeDashboardOptionsFlow(config_entries.OptionsFlow):
    """Manage DAZE Dashboard options."""

    async def async_step_init(self, user_input=None):
        """Manage dashboard options."""
        current = self.config_entry.options

        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        schema = vol.Schema(
            {
                vol.Optional(
                    OPTION_SHOW_CHART,
                    default=current.get(OPTION_SHOW_CHART, DEFAULT_SHOW_CHART),
                ): bool,
                vol.Optional(
                    OPTION_SHOW_SESSION_STATS,
                    default=current.get(
                        OPTION_SHOW_SESSION_STATS,
                        DEFAULT_SHOW_SESSION_STATS,
                    ),
                ): bool,
                vol.Optional(
                    OPTION_SHOW_DIAGNOSTICS,
                    default=current.get(
                        OPTION_SHOW_DIAGNOSTICS,
                        DEFAULT_SHOW_DIAGNOSTICS,
                    ),
                ): bool,
                vol.Optional(
                    OPTION_THEME,
                    default=current.get(OPTION_THEME, DEFAULT_THEME),
                ): vol.In(["auto", "dark", "light"]),
            }
        )

        return self.async_show_form(
            step_id="init",
            data_schema=schema,
        )

# Changelog

## 0.3.0

### Generic DAZE entity discovery

- Added generic runtime discovery for the current `ha-daze` sensor set.
- Added wallbox status, EVSE status, power, session energy, current, voltage and maximum current.
- Added grid current, system error, fan state, case temperature and board temperature.
- Added energy tariff, Wi-Fi SSID, firmware and software information.
- Derives the common charger prefix from the EVSE entity instead of using a fixed wallbox name or serial.
- Removed all user-specific entity IDs from the public frontend.
- Removed dependencies on private vehicle, photovoltaic and helper entities.
- Charging state is derived directly from DAZE wallbox power.
- Added privacy/entity-discovery documentation.

## 0.2.1

### Hotfix

- Fixed Home Assistant startup failure in `async_register_panel()`.
- Removed unsupported `handle_safe_area` argument for compatibility with current Home Assistant panel registration API.
- Bumped frontend cache/version marker to 0.2.1.

## 0.2.0

### Documentation and distribution

- Added direct references to the `ha-daze` companion integration.
- Added explicit project architecture and separation between `ha-daze` and DAZE Dashboard.
- Added one-click My Home Assistant / HACS custom repository link.
- Added manual HACS custom repository installation instructions.
- Added GitHub, HACS, Home Assistant and license badges.
- Corrected the repository owner and project links to `fabiovit/daze-dashboard`.
- Added credits to `rdndnl/ha-daze`.
- Added issue and support references.
- Updated component version to 0.2.0.
- No major functional dashboard changes in this release.

## 0.1.0

- Initial project structure.
- Added Home Assistant config flow.
- Added automatic sidebar panel.
- Added first DAZE overview panel.
- Added HACS metadata.

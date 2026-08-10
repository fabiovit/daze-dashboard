# Changelog

## 0.5.0

### Backend discovery and live WebSocket data

- Moved DAZE entity discovery from the JavaScript frontend to the Python backend.
- Discovery now uses Home Assistant's entity registry and `ha-daze` platform metadata.
- Logical fields are identified through stable `ha-daze` entity `unique_id` keys.
- Added `entity_map.py` for backend entity discovery.
- Added `api.py` with a dedicated `daze_dashboard/subscribe` WebSocket command.
- Relevant DAZE state changes are pushed live to the panel.
- The frontend now renders logical DAZE values and no longer searches Home Assistant entity IDs.
- No additional DAZE cloud polling is introduced.
- Preserved privacy-safe UI behavior: no SSID, serial, room/home name or personal entity ID is displayed.

## 0.4.0

### Live dashboard refinement

- Redesigned the charging hero with larger live power display.
- Added a dynamic power bar based on wallbox power, maximum current and voltage.
- Added human-friendly EVSE status labels such as `In attesa`, `In carica` and `Auto collegata`.
- Removed the detected wallbox prefix/serial from the visible UI.
- Wi-Fi now shows connection availability instead of exposing the SSID.
- Simplified diagnostic labels (`Case`, `Scheda`, `Ventola`, `Wi-Fi`).
- Improved system error presentation.
- Removed developer/privacy debug text from the footer.
- Footer now shows only DAZE Dashboard version and `Powered by ha-daze`.
- Kept generic runtime entity discovery and no personal entity IDs.

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

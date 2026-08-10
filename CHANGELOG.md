# Changelog

## 0.3.0

### DAZE entity coverage

- Added all currently available `ha-daze` entities from the reference installation.
- Added energy tariff, grid current, Wi-Fi SSID, firmware and software information.
- Added system error status.
- Added raw wallbox power alongside the converted kW value.
- Added charging current, maximum current, voltage and session energy.
- Added case and board temperatures.
- Added fan state.
- Redesigned the main panel into charging, diagnostics and information sections.
- Kept optional Home Assistant charging helper support.
- Updated frontend version to 0.3.0.

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

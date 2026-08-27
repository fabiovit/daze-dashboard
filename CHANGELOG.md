# Changelog

## 2.1.0 — Dynamic visual refresh

- Redesigned the main charging hero with a live circular power indicator.
- Added charging-state visual feedback and subtle pulse effects.
- Added status pill, live session energy, duration and estimated cost to the hero.
- Added animated power-limit progress.
- Improved depth, spacing and hover feedback across cards.
- Added smoother value transitions and reduced-motion support.
- Refined mobile layout while preserving the mobile-only Home Assistant menu.
- Added official dark/light screenshots to the repository.
- Added Ko-fi support information to the README.
- Backend, privacy-safe discovery and ha-daze compatibility remain unchanged.

## 2.0.0 — Stable codebase refresh

DAZE Dashboard 2.0 consolidates the stable 1.x work into a cleaner baseline.

### Code

- Centralized runtime version handling through `VERSION`.
- Removed hard-coded panel/frontend version strings from backend registration.
- Centralized the `ha-daze` platform constant.
- Simplified Config Flow entity detection.
- Refactored entity discovery to scan the registry once.
- Removed unused discovery variables and duplicate lookup passes.
- Cleaned backend formatting and internal registration helpers.
- Kept privacy-safe entity discovery and WebSocket architecture unchanged.

### Interface

- Preserved the Casa/Inverter-aligned responsive shell.
- Preserved the mobile-only Home Assistant menu.
- Preserved the large kW/kWh and secondary A metric hierarchy.
- Version badge and footer continue to use panel configuration dynamically.

### Repository

- Simplified README and FAQ around the current stable architecture.
- Retained HACS Validate and Hassfest workflows.
- Updated checkout action used by Hassfest.
- Preserved all `ha-daze` references and credits.

Previous release history remains available in GitHub Releases.

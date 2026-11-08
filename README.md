# ⚡ DAZE Dashboard

🇬🇧 English | 🇮🇹 [Italiano](README.it.md)

[![release](https://img.shields.io/github/v/release/fabiovit/daze-dashboard?label=release)](https://github.com/fabiovit/daze-dashboard/releases)
[![Marketplace](https://img.shields.io/badge/Home%20Assistant-Marketplace-18BCF2.svg)](https://www.home-assistant.io/integrations/marketplace)
[![Validate](https://github.com/fabiovit/daze-dashboard/actions/workflows/validate.yml/badge.svg)](https://github.com/fabiovit/daze-dashboard/actions/workflows/validate.yml)
[![Hassfest](https://github.com/fabiovit/daze-dashboard/actions/workflows/hassfest.yml/badge.svg)](https://github.com/fabiovit/daze-dashboard/actions/workflows/hassfest.yml)
[![license](https://img.shields.io/github/license/fabiovit/daze-dashboard?label=license)](https://github.com/fabiovit/daze-dashboard/blob/main/LICENSE)

A modern Home Assistant sidebar dashboard for DAZE EV chargers.

> **Stable release:** v2.3.1

DAZE Dashboard is an **independent companion project** for
[`ha-daze`](https://github.com/rdndnl/ha-daze).

`ha-daze` remains responsible for communicating with DAZE and exposing the wallbox
entities in Home Assistant. DAZE Dashboard reads those existing entities and adds a
dedicated presentation layer. It does not replace, modify, or add polling to
`ha-daze` or the DAZE cloud.

## 🖼️ Screenshots

### Overview / Panoramica

| English | Italiano |
| --- | --- |
| ![Overview in English](screenshots/overview-en.png) | ![Panoramica in italiano](screenshots/overview-it.png) |

### Diagnostics / Diagnostica

| English | Italiano |
| --- | --- |
| ![Diagnostics in English](screenshots/diagnostics-en.png) | ![Diagnostica in italiano](screenshots/diagnostics-it.png) |

### Information / Informazioni

| English | Italiano |
| --- | --- |
| ![Information in English](screenshots/information-en.png) | ![Informazioni in italiano](screenshots/information-it.png) |

## Requirements

- Home Assistant 2026.3.0 or newer
- Home Assistant Marketplace (built into Home Assistant 2026.11 and later)
- [`ha-daze`](https://github.com/rdndnl/ha-daze) installed and configured

## Installation with Home Assistant Marketplace

On **Home Assistant 2026.11 or later**, open **Settings → Marketplace**.

1. Select **Add from link** (if DAZE Dashboard is not already in the catalog).
2. Enter `https://github.com/fabiovit/daze-dashboard` and select the **Integration** type if asked.
3. Install **DAZE Dashboard**.
4. If Home Assistant requests a restart, restart it.
5. Open **Settings → Devices & services → Add integration** and add **DAZE Dashboard**.
6. Open the new **DAZE** sidebar panel.

You must also install and configure [`ha-daze`](https://github.com/rdndnl/ha-daze), which supplies the charger entities.

**Upgrading from HACS?** Home Assistant migrates existing HACS installations and custom repositories automatically when upgrading to 2026.11. There is no need to remove or reinstall DAZE Dashboard.

**Using Home Assistant 2026.3–2026.10?** These versions still use HACS. This repository retains its HACS-compatible `hacs.json` and structure.

No YAML configuration is required.

## Manual installation

Copy:

```text
custom_components/daze_dashboard
```

to:

```text
/config/custom_components/daze_dashboard
```

Restart Home Assistant and add **DAZE Dashboard** from **Devices & services**.

## Features

- Dedicated Home Assistant sidebar panel
- Config Flow and options flow
- Automatic privacy-safe `ha-daze` entity discovery
- Backend WebSocket subscription with live Home Assistant state updates
- Wallbox and EVSE state
- Start, stop and resume charging controls powered by ha-daze
- Native session duration, start time, session ID and session user when available
- Charging power and session energy
- Charging/grid current and voltage
- Charging limit
- Case and board temperatures
- Fan and system diagnostics
- Five-minute live charging graph
- Live session timer and average power
- Estimated session cost when a tariff is available
- Responsive desktop/mobile interface
- Home Assistant light/dark theme support
- Mobile-only Home Assistant hamburger menu
- Overview, Diagnostics and Information views

## Architecture and privacy

Entity discovery happens in the Python backend using the Home Assistant entity
registry and the stable `unique_id` keys exposed by `ha-daze`.

```text
DAZE wallbox
     │
     ▼
   ha-daze
     │
     ▼
Home Assistant entities
     │
     ▼
DAZE Dashboard backend
     │ WebSocket
     ▼
DAZE Dashboard frontend
```

The public project contains no personal entity IDs, home names, wallbox serial
numbers, vehicle names, people, rooms, or custom helpers.

## UI options

Open:

**Settings → Devices & services → DAZE Dashboard → Configure**

Available options:

- Show/hide live power chart
- Show/hide session statistics
- Show/hide diagnostics
- Theme: Auto / Dark / Light

## Relationship with ha-daze

DAZE Dashboard is only the presentation layer.

Special thanks to
[`rdndnl/ha-daze`](https://github.com/rdndnl/ha-daze)
for the Home Assistant integration that exposes DAZE wallbox data.

DAZE Dashboard is **not affiliated with or endorsed by DAZE or the ha-daze project**.

## Issues

For DAZE Dashboard issues:

https://github.com/fabiovit/daze-dashboard/issues

For communication with the wallbox or entities supplied by the underlying
integration:

https://github.com/rdndnl/ha-daze/issues

## ☕ Support DAZE Dashboard

If you enjoy DAZE Dashboard and want to support its development, you can buy me a coffee on Ko-fi:

**https://ko-fi.com/fabvittori**

## License

MIT

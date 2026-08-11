# ⚡ DAZE Dashboard

A modern sidebar dashboard for DAZE EV chargers in Home Assistant.

[![GitHub release](https://img.shields.io/github/v/release/fabiovit/daze-dashboard)](https://github.com/fabiovit/daze-dashboard/releases)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom%20Repository-41BDF5.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=fabiovit&repository=daze-dashboard&category=integration)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2026.8%2B-41BDF5.svg)](https://www.home-assistant.io/)
[![License](https://img.shields.io/github/license/fabiovit/daze-dashboard)](https://github.com/fabiovit/daze-dashboard/blob/main/LICENSE)

> **Stable release:** v1.0.1

DAZE Dashboard is an **independent companion project** for the excellent
[`ha-daze`](https://github.com/rdndnl/ha-daze) Home Assistant integration.

It does **not** replace or modify `ha-daze`.  
`ha-daze` communicates with DAZE and exposes the wallbox entities to Home Assistant;
DAZE Dashboard reads those Home Assistant entities and presents them in a dedicated
sidebar interface.

## 🔗 Projects

- **DAZE Dashboard:** https://github.com/fabiovit/daze-dashboard
- **ha-daze:** https://github.com/rdndnl/ha-daze

## 🧩 How it works

```text
DAZE wallbox
     │
     ▼
   ha-daze
     │
     │ Home Assistant entities
     ▼
DAZE Dashboard
```

This separation means the two projects can be updated independently.

## 📋 Requirements

Before installing DAZE Dashboard, install and configure:

### ha-daze

https://github.com/rdndnl/ha-daze

DAZE Dashboard currently relies on the entities exposed by `ha-daze`.

## 📦 Install with HACS

### One-click HACS link

[![Open your Home Assistant instance and open this repository inside HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=fabiovit&repository=daze-dashboard&category=integration)

If the button above does not work, add the repository manually.

### Manual HACS custom repository

1. Open **HACS** in Home Assistant.
2. Open the menu in the top-right corner.
3. Select **Custom repositories**.
4. Add:

```text
https://github.com/fabiovit/daze-dashboard
```

5. Select repository type:

```text
Integration
```

6. Install **DAZE Dashboard**.
7. Restart Home Assistant.
8. Go to **Settings → Devices & services → Add integration**.
9. Search for **DAZE Dashboard** and add it.
10. The **DAZE** panel will appear in the Home Assistant sidebar.

After a new release is published, HACS can detect the new version and offer the
repository update.

## 🛠️ Manual installation

Copy:

```text
custom_components/daze_dashboard
```

to:

```text
/config/custom_components/daze_dashboard
```

Restart Home Assistant, then add **DAZE Dashboard** from:

```text
Settings → Devices & services → Add integration
```


## 🔐 Privacy and entity discovery

DAZE Dashboard does not ship with personal Home Assistant entity IDs.

The frontend discovers compatible DAZE entities at runtime using generic suffixes
and the common charger entity prefix exposed by `ha-daze`.

Names of homes, rooms, wallboxes, serial numbers, vehicles, people and custom
helpers are not hardcoded in the public project.



## 🧠 Backend architecture

Starting with v0.5.0, DAZE Dashboard discovers `ha-daze` entities in the Python
backend using Home Assistant's entity registry and the stable `unique_id` keys
defined by `ha-daze`.

The frontend no longer performs entity-name or entity-id discovery.

```text
ha-daze entities
      │
      ▼
DAZE Dashboard backend
(entity registry discovery)
      │
      ▼
WebSocket subscription
      │
      ▼
DAZE Dashboard frontend
(logical values only)
```

Relevant wallbox state changes are pushed to the panel through a custom
Home Assistant WebSocket subscription. No polling of the DAZE cloud is added by
DAZE Dashboard.



## ✅ Stable 1.0

DAZE Dashboard 1.0 is the first stable release.

The stable baseline includes HACS installation, a Home Assistant setup wizard,
single-config-entry protection, privacy-safe `ha-daze` entity discovery,
backend WebSocket updates, the dedicated sidebar panel, five-minute live power
graph, session statistics, smart diagnostics, UI options, responsive layouts,
Italian/English setup translations and local Home Assistant brand assets.

No YAML is required.

## ⚙️ UI configuration

Starting with v0.7.0, the panel can be customized directly from Home Assistant:

**Settings → Devices & services → DAZE Dashboard → Configure**

Available options:

- Show/hide the live power chart
- Show/hide session statistics
- Show/hide diagnostics
- Theme: Auto / Dark / Light

No YAML is required.

## 📈 Live graph and session statistics

The live graph keeps up to five minutes of power samples in the browser while
the panel is open. This is intentionally lightweight and does not create a new
database or poll the DAZE cloud.

Session statistics include:

- DAZE session energy
- Live elapsed time
- Average power of the samples collected while the panel is open
- Estimated session cost from DAZE session energy × the available energy tariff

The live timer and average are panel-session values and are not yet persistent
across browser reloads.


## ✨ Current features

- Home Assistant Config Flow — no YAML required
- Automatic sidebar panel registration
- Live Home Assistant state updates
- Initial DAZE entity detection
- Wallbox status
- EVSE status
- Charging power
- Session energy
- Current and voltage
- Maximum charging current
- Case and board temperatures
- Fan status
- Responsive interface
- Home Assistant light/dark theme compatibility
- Three dedicated panel views: Overview, Diagnostics and Information
- Dynamic status accent and charging animation
- Smart temperature and system diagnostics
- Live charging session timer while the panel is open
- Redesigned live dashboard interface
- Human-friendly EVSE status labels
- Dynamic charging power bar
- Privacy-safe Wi-Fi display

## 🔌 Relationship with ha-daze

[`ha-daze`](https://github.com/rdndnl/ha-daze) remains responsible for communication with DAZE and for
creating the Home Assistant entities used by this project.

DAZE Dashboard is only the presentation layer.

DAZE Dashboard is **not affiliated with or endorsed by DAZE or the ha-daze project**.
The reference to `ha-daze` is provided to document the required companion integration
and to credit the work on which the dashboard's data source depends.

## 🤝 Credits

Special thanks to [`rdndnl/ha-daze`](https://github.com/rdndnl/ha-daze) for providing the Home Assistant
integration that exposes DAZE wallbox data.

## 🗺️ Roadmap

- **v0.3.0** — improved automatic entity/device discovery
- **v0.4.0** — redesigned live charging overview
- **v0.5.0** — optional vehicle and energy-flow data
- **v1.0.0** — stable release

## 🐛 Issues

Found a problem with DAZE Dashboard?

https://github.com/fabiovit/daze-dashboard/issues

For issues concerning communication with the DAZE wallbox itself or entities exposed
by the underlying integration, refer to the `ha-daze` project:

https://github.com/rdndnl/ha-daze/issues

## 📄 License

MIT

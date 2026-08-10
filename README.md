# ⚡ DAZE Dashboard

A modern sidebar dashboard for DAZE EV chargers in Home Assistant.

> **Status:** early development — v0.1.0

DAZE Dashboard is a separate Home Assistant custom integration. It does **not**
modify `ha-daze`: it reads the entities already exposed in Home Assistant and
renders them in a dedicated sidebar panel.

## v0.1.0

The first technical release provides:

- Home Assistant config flow (no YAML required)
- automatic sidebar panel registration
- live Home Assistant state updates
- initial automatic discovery of common DAZE entity IDs
- wallbox status
- EVSE status
- charging power
- session energy
- current and voltage
- maximum charging current
- case and board temperatures
- fan status
- responsive light/dark-theme-friendly layout

## Installation for development

### Manual

1. Copy `custom_components/daze_dashboard` to `/config/custom_components/`.
2. Restart Home Assistant.
3. Go to **Settings → Devices & services → Add integration**.
4. Search for **DAZE Dashboard**.
5. Add it.
6. A new **DAZE** item will appear in the sidebar.

### HACS custom repository

Once this repository has been published on GitHub:

1. Open HACS.
2. Open **Custom repositories**.
3. Add the repository URL as type **Integration**.
4. Install **DAZE Dashboard**.
5. Restart Home Assistant.
6. Add **DAZE Dashboard** from **Settings → Devices & services**.

## Relationship with ha-daze

`ha-daze` remains responsible for communicating with DAZE and exposing entities.
DAZE Dashboard is only the user interface layer.

## Roadmap

- v0.2.0: robust DAZE device/entity auto-discovery
- v0.3.0: redesigned charging overview
- v0.4.0: optional EV/BYD section
- v0.5.0: PV/grid energy flow view
- v1.0.0: stable HACS release

## License

MIT

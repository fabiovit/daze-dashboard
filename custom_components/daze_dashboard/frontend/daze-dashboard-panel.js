const DAZE = {
  tariff: "sensor.casa_vittori_saleri_tariffa_energetica",
  gridCurrent: "sensor.garage_corrente_di_rete_l1",
  wifi: "sensor.garage_ssid_wi_fi",
  firmware: "sensor.garage_versione_firmware",
  software: "sensor.garage_versione_software",

  current: "sensor.garage_25dt0102020_corrente_di_carica_l1",
  sessionEnergy: "sensor.garage_25dt0102020_energia_sessione",
  systemError: "sensor.garage_25dt0102020_errore_di_sistema",
  rawPower: "sensor.garage_25dt0102020_potenza",
  status: "sensor.garage_25dt0102020_codice_stato",
  evse: "sensor.garage_25dt0102020_codice_stato_evse",
  voltage: "sensor.garage_25dt0102020_tensione_l1",
  maxCurrent: "sensor.garage_25dt0102020_corrente_di_carica_massima",
  fan: "sensor.garage_25dt0102020_stato_ventola",
  caseTemp: "sensor.garage_25dt0102020_temperatura_case",
  boardTemp: "sensor.garage_25dt0102020_temperatura_scheda",

  powerKw: "sensor.daze_potenza_ricarica",
  charging: "binary_sensor.ev_in_carica_a_casa",
};

class DazeDashboardPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = undefined;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  set panel(panel) {
    this._panel = panel;
    this._render();
  }

  set narrow(narrow) {
    this._narrow = narrow;
  }

  set route(route) {
    this._route = route;
  }

  _entity(entityId) {
    return this._hass?.states?.[entityId];
  }

  _state(entityId, fallback = "—") {
    const value = this._entity(entityId)?.state;
    if (
      value === undefined ||
      value === null ||
      ["unknown", "unavailable", "none", ""].includes(String(value).toLowerCase())
    ) {
      return fallback;
    }
    return value;
  }

  _number(entityId, decimals = 1, suffix = "") {
    const raw = this._state(entityId, null);
    if (raw === null) return "—";
    const n = Number(raw);
    if (!Number.isFinite(n)) return `${raw}${suffix}`;
    return `${n.toLocaleString("it-IT", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
  }

  _isOn(entityId) {
    return this._state(entityId, "off") === "on";
  }

  _power() {
    const kwRaw = this._state(DAZE.powerKw, null);
    if (kwRaw !== null) {
      const kw = Number(kwRaw);
      if (Number.isFinite(kw)) {
        return `${kw.toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} kW`;
      }
    }

    const wattsRaw = this._state(DAZE.rawPower, null);
    if (wattsRaw !== null) {
      const watts = Number(wattsRaw);
      if (Number.isFinite(watts)) {
        return `${(watts / 1000).toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} kW`;
      }
    }

    return "—";
  }

  _statusTone() {
    if (this._isOn(DAZE.charging)) return "charging";

    const evse = this._state(DAZE.evse, "").toLowerCase();
    if (!evse) return "offline";
    if (evse.includes("attesa") || evse.includes("standby")) return "idle";
    return "connected";
  }

  _errorTone() {
    const err = this._state(DAZE.systemError, "").toLowerCase();
    if (!err) return "neutral";
    if (err.includes("nessun") || err.includes("no error")) return "ok";
    return "bad";
  }

  _metric(icon, label, value, extraClass = "") {
    return `
      <div class="metric ${extraClass}">
        <div class="metric-icon"><ha-icon icon="${icon}"></ha-icon></div>
        <div class="metric-content">
          <div class="metric-label">${label}</div>
          <div class="metric-value">${value}</div>
        </div>
      </div>
    `;
  }

  _render() {
    if (!this.shadowRoot) return;

    if (!this._hass) {
      this.shadowRoot.innerHTML = `<div style="padding:24px">Caricamento DAZE Dashboard…</div>`;
      return;
    }

    const charging = this._isOn(DAZE.charging);
    const status = this._state(DAZE.status, "Stato non disponibile");
    const evse = this._state(DAZE.evse, "Stato EVSE non disponibile");
    const tone = this._statusTone();
    const errorTone = this._errorTone();
    const error = this._state(DAZE.systemError, "—");

    const heroLabel = charging ? "IN CARICA" : String(evse).toUpperCase();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          min-height: 100%;
          background: var(--primary-background-color);
          color: var(--primary-text-color);
          font-family: var(--paper-font-body1_-_font-family, system-ui, sans-serif);
        }

        * { box-sizing: border-box; }

        .page {
          max-width: 1240px;
          margin: 0 auto;
          padding: 24px;
        }

        .hero {
          border-radius: 30px;
          padding: 32px;
          border: 1px solid var(--divider-color);
          background:
            radial-gradient(circle at 82% 12%, rgba(56,189,248,.23), transparent 35%),
            radial-gradient(circle at 10% 110%, rgba(99,102,241,.13), transparent 38%),
            var(--card-background-color);
          box-shadow: var(--ha-card-box-shadow, 0 10px 36px rgba(0,0,0,.08));
          overflow: hidden;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 24px;
        }

        .kicker {
          font-size: 11px;
          font-weight: 850;
          letter-spacing: .18em;
          opacity: .55;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0;
          font-size: clamp(40px, 7vw, 68px);
          letter-spacing: -.055em;
          line-height: .95;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-top: 16px;
          padding: 9px 14px;
          border-radius: 999px;
          background: var(--secondary-background-color);
          font-size: 13px;
          font-weight: 850;
          letter-spacing: .05em;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: currentColor;
        }

        .charging { color: #ffb300; }
        .connected { color: #2196f3; }
        .idle { color: #8b8b8b; }
        .offline { color: #ef5350; }

        .hero-status {
          margin-top: 12px;
          opacity: .68;
          font-weight: 650;
        }

        .power-block {
          text-align: right;
        }

        .power {
          font-size: clamp(42px, 8vw, 74px);
          line-height: .9;
          font-weight: 950;
          letter-spacing: -.065em;
        }

        .power-sub {
          margin-top: 10px;
          opacity: .58;
          font-weight: 700;
        }

        .section {
          margin-top: 18px;
          background: var(--card-background-color);
          border: 1px solid var(--divider-color);
          border-radius: 24px;
          padding: 20px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 850;
          margin-bottom: 16px;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .metric {
          min-width: 0;
          padding: 14px;
          border-radius: 18px;
          background: var(--secondary-background-color);
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .metric-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: var(--primary-color);
          background: color-mix(in srgb, var(--primary-color) 12%, transparent);
        }

        .metric-content { min-width: 0; }

        .metric-label {
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .08em;
          text-transform: uppercase;
          opacity: .55;
        }

        .metric-value {
          margin-top: 4px;
          font-size: 18px;
          font-weight: 850;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .metric.ok .metric-icon { color: #43a047; }
        .metric.bad .metric-icon { color: #ef5350; }
        .metric.neutral .metric-icon { color: #8b8b8b; }

        .footer {
          text-align: center;
          font-size: 12px;
          opacity: .5;
          margin: 18px 0 6px;
        }

        @media (max-width: 980px) {
          .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 720px) {
          .hero-grid { grid-template-columns: 1fr; }
          .power-block { text-align: left; }
        }

        @media (max-width: 540px) {
          .page { padding: 14px; }
          .hero { padding: 22px; border-radius: 22px; }
          .section { border-radius: 20px; padding: 15px; }
          .metrics { grid-template-columns: 1fr; }
        }
      </style>

      <main class="page">
        <section class="hero">
          <div class="hero-grid">
            <div>
              <div class="kicker">HOME ASSISTANT · DAZE WALLBOX</div>
              <h1>DAZE</h1>
              <div class="status-pill ${tone}">
                <span class="dot"></span>
                ${heroLabel}
              </div>
              <div class="hero-status">${status}</div>
            </div>

            <div class="power-block">
              <div class="power">${this._power()}</div>
              <div class="power-sub">${charging ? "Potenza di ricarica" : "Potenza wallbox"}</div>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-title">
            <ha-icon icon="mdi:ev-station"></ha-icon>
            Ricarica
          </div>
          <div class="metrics">
            ${this._metric("mdi:ev-plug-type2", "Stato EVSE", evse)}
            ${this._metric("mdi:lightning-bolt-circle", "Energia sessione", this._number(DAZE.sessionEnergy, 2, " kWh"))}
            ${this._metric("mdi:current-ac", "Corrente L1", this._number(DAZE.current, 1, " A"))}
            ${this._metric("mdi:sine-wave", "Tensione L1", this._number(DAZE.voltage, 0, " V"))}
            ${this._metric("mdi:flash", "Potenza grezza", this._number(DAZE.rawPower, 0, " W"))}
            ${this._metric("mdi:current-ac", "Corrente massima", this._number(DAZE.maxCurrent, 1, " A"))}
            ${this._metric("mdi:transmission-tower", "Corrente rete L1", this._number(DAZE.gridCurrent, 1, " A"))}
            ${this._metric("mdi:alert-circle-outline", "Errore sistema", error, errorTone)}
          </div>
        </section>

        <section class="section">
          <div class="section-title">
            <ha-icon icon="mdi:thermometer-lines"></ha-icon>
            Diagnostica wallbox
          </div>
          <div class="metrics">
            ${this._metric("mdi:thermometer", "Temperatura case", this._number(DAZE.caseTemp, 1, " °C"))}
            ${this._metric("mdi:thermometer-lines", "Temperatura scheda", this._number(DAZE.boardTemp, 1, " °C"))}
            ${this._metric("mdi:fan", "Stato ventola", this._state(DAZE.fan))}
            ${this._metric("mdi:wifi", "SSID Wi-Fi", this._state(DAZE.wifi))}
          </div>
        </section>

        <section class="section">
          <div class="section-title">
            <ha-icon icon="mdi:information-outline"></ha-icon>
            Informazioni DAZE
          </div>
          <div class="metrics">
            ${this._metric("mdi:cash", "Tariffa energetica", this._state(DAZE.tariff))}
            ${this._metric("mdi:chip", "Firmware", this._state(DAZE.firmware))}
            ${this._metric("mdi:application-cog-outline", "Software", this._state(DAZE.software))}
            ${this._metric("mdi:home-assistant", "Ricarica HA", this._entity(DAZE.charging) ? (charging ? "Attiva" : "Non attiva") : "Sensore opzionale assente")}
          </div>
        </section>

        <div class="footer">
          DAZE Dashboard v0.3.0 · dati live da Home Assistant / ha-daze
        </div>
      </main>
    `;
  }
}

if (!customElements.get("daze-dashboard-panel")) {
  customElements.define("daze-dashboard-panel", DazeDashboardPanel);
}

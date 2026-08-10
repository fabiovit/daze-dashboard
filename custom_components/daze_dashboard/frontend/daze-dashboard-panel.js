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
    return entityId ? this._hass?.states?.[entityId] : undefined;
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

  _allSensorIds() {
    return Object.keys(this._hass?.states || {}).filter((id) => id.startsWith("sensor."));
  }

  _findFirstBySuffix(...suffixes) {
    const ids = this._allSensorIds();
    for (const suffix of suffixes) {
      const match = ids.find((id) => id.endsWith(suffix));
      if (match) return match;
    }
    return undefined;
  }

  _findChargerPrefix() {
    const evse = this._findFirstBySuffix(
      "_codice_stato_evse",
      "_stato_evse",
      "_evse_state"
    );

    if (!evse) return undefined;

    for (const suffix of ["_codice_stato_evse", "_stato_evse", "_evse_state"]) {
      if (evse.endsWith(suffix)) {
        return evse.slice(0, -suffix.length);
      }
    }

    return undefined;
  }

  _withPrefix(prefix, ...suffixes) {
    if (!prefix) return undefined;

    for (const suffix of suffixes) {
      const id = `${prefix}${suffix}`;
      if (this._hass?.states?.[id]) return id;
    }

    return undefined;
  }

  _discover() {
    const prefix = this._findChargerPrefix();

    return {
      prefix,

      status:
        this._withPrefix(prefix, "_codice_stato", "_stato", "_status") ||
        this._findFirstBySuffix("_codice_stato", "_stato"),

      evse:
        this._withPrefix(prefix, "_codice_stato_evse", "_stato_evse", "_evse_state") ||
        this._findFirstBySuffix("_codice_stato_evse", "_stato_evse", "_evse_state"),

      sessionEnergy:
        this._withPrefix(prefix, "_energia_sessione", "_session_energy") ||
        this._findFirstBySuffix("_energia_sessione", "_session_energy"),

      rawPower:
        this._withPrefix(prefix, "_potenza", "_power") ||
        this._findFirstBySuffix("_potenza", "_power"),

      current:
        this._withPrefix(prefix, "_corrente_di_carica_l1", "_charging_current_l1") ||
        this._findFirstBySuffix("_corrente_di_carica_l1", "_charging_current_l1"),

      voltage:
        this._withPrefix(prefix, "_tensione_l1", "_voltage_l1") ||
        this._findFirstBySuffix("_tensione_l1", "_voltage_l1"),

      maxCurrent:
        this._withPrefix(prefix, "_corrente_di_carica_massima", "_maximum_charging_current") ||
        this._findFirstBySuffix("_corrente_di_carica_massima", "_maximum_charging_current"),

      fan:
        this._withPrefix(prefix, "_stato_ventola", "_fan_state") ||
        this._findFirstBySuffix("_stato_ventola", "_fan_state"),

      caseTemp:
        this._withPrefix(prefix, "_temperatura_case", "_case_temperature") ||
        this._findFirstBySuffix("_temperatura_case", "_case_temperature"),

      boardTemp:
        this._withPrefix(prefix, "_temperatura_scheda", "_board_temperature") ||
        this._findFirstBySuffix("_temperatura_scheda", "_board_temperature"),

      systemError:
        this._withPrefix(prefix, "_errore_di_sistema", "_system_error") ||
        this._findFirstBySuffix("_errore_di_sistema", "_system_error"),

      gridCurrent:
        this._findFirstBySuffix("_corrente_di_rete_l1", "_grid_current_l1"),

      wifi:
        this._findFirstBySuffix("_ssid_wi_fi", "_wifi_ssid", "_ssid_wifi"),

      firmware:
        this._findFirstBySuffix("_versione_firmware", "_firmware_version"),

      software:
        this._findFirstBySuffix("_versione_software", "_software_version"),

      tariff:
        this._findFirstBySuffix("_tariffa_energetica", "_energy_tariff"),
    };
  }

  _rawPowerWatts(e) {
    const raw = this._state(e.rawPower, null);
    if (raw === null) return NaN;
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }

  _power(e) {
    const watts = this._rawPowerWatts(e);
    if (!Number.isFinite(watts)) return "—";

    return `${(watts / 1000).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kW`;
  }

  _isCharging(e) {
    const watts = this._rawPowerWatts(e);
    return Number.isFinite(watts) && watts > 300;
  }

  _humanStatus(value) {
    if (!value || value === "—") return "Non disponibile";

    const s = String(value).trim();
    const l = s.toLowerCase();

    if (["standby", "idle", "waiting", "in attesa"].includes(l)) return "In attesa";
    if (l.includes("charg")) return "In carica";
    if (l.includes("connected") || l.includes("colleg")) return "Auto collegata";
    if (l.includes("complete") || l.includes("terminat") || l.includes("finished")) return "Carica completata";
    if (l.includes("fault") || l.includes("error") || l.includes("errore")) return "Errore";

    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  _statusTone(e) {
    if (this._isCharging(e)) return "charging";

    const evse = this._state(e.evse, "").toLowerCase();
    if (!evse) return "offline";
    if (evse.includes("attesa") || evse.includes("standby") || evse.includes("idle")) return "idle";
    if (evse.includes("error") || evse.includes("fault")) return "offline";
    return "connected";
  }

  _errorInfo(e) {
    const raw = this._state(e.systemError, "—");
    const l = String(raw).toLowerCase();

    if (raw === "—") return { text: "Non disponibile", tone: "neutral" };
    if (l.includes("nessun") || l.includes("no error") || l === "ok") {
      return { text: "Nessun errore", tone: "ok" };
    }
    return { text: raw, tone: "bad" };
  }

  _wifiText(e) {
    return this._entity(e.wifi) ? "Connesso" : "Non disponibile";
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

  _powerPercent(e) {
    const watts = this._rawPowerWatts(e);
    const current = Number(this._state(e.maxCurrent, "NaN"));
    const voltage = Number(this._state(e.voltage, "NaN"));

    if (!Number.isFinite(watts) || !Number.isFinite(current) || !Number.isFinite(voltage)) {
      return 0;
    }

    const maxWatts = current * voltage;
    if (maxWatts <= 0) return 0;

    return Math.max(0, Math.min(100, (watts / maxWatts) * 100));
  }

  _render() {
    if (!this.shadowRoot) return;

    if (!this._hass) {
      this.shadowRoot.innerHTML = `<div style="padding:24px">Caricamento DAZE Dashboard…</div>`;
      return;
    }

    const e = this._discover();
    const charging = this._isCharging(e);
    const status = this._humanStatus(this._state(e.status, "—"));
    const evse = this._humanStatus(this._state(e.evse, "—"));
    const tone = this._statusTone(e);
    const error = this._errorInfo(e);
    const heroLabel = charging ? "IN CARICA" : evse.toUpperCase();
    const powerPercent = this._powerPercent(e);

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
          padding: 34px;
          border: 1px solid var(--divider-color);
          background:
            radial-gradient(circle at 82% 12%, rgba(56,189,248,.25), transparent 36%),
            radial-gradient(circle at 10% 110%, rgba(99,102,241,.14), transparent 40%),
            var(--card-background-color);
          box-shadow: var(--ha-card-box-shadow, 0 10px 36px rgba(0,0,0,.08));
          overflow: hidden;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 30px;
        }

        .kicker {
          font-size: 11px;
          font-weight: 850;
          letter-spacing: .18em;
          opacity: .55;
          margin-bottom: 10px;
        }

        h1 {
          margin: 0;
          font-size: clamp(42px, 7vw, 72px);
          letter-spacing: -.06em;
          line-height: .92;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-top: 17px;
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
          min-width: 320px;
        }

        .power {
          font-size: clamp(52px, 9vw, 90px);
          line-height: .86;
          font-weight: 950;
          letter-spacing: -.07em;
        }

        .power-sub {
          margin-top: 12px;
          opacity: .58;
          font-weight: 700;
        }

        .power-track {
          width: 100%;
          height: 7px;
          margin-top: 18px;
          border-radius: 999px;
          overflow: hidden;
          background: var(--secondary-background-color);
        }

        .power-fill {
          height: 100%;
          width: ${powerPercent}%;
          min-width: ${charging ? "4%" : "0"};
          border-radius: inherit;
          background: linear-gradient(90deg, #38bdf8, #22c55e);
          transition: width .45s ease;
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
          display: flex;
          justify-content: center;
          gap: 8px;
          align-items: center;
          font-size: 12px;
          opacity: .5;
          margin: 18px 0 6px;
        }

        @media (max-width: 980px) {
          .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 760px) {
          .hero-grid { grid-template-columns: 1fr; }
          .power-block { text-align: left; min-width: 0; }
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
              <div class="power">${this._power(e)}</div>
              <div class="power-sub">${charging ? "Potenza di ricarica" : "Potenza wallbox"}</div>
              <div class="power-track">
                <div class="power-fill"></div>
              </div>
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
            ${this._metric("mdi:lightning-bolt-circle", "Energia sessione", this._number(e.sessionEnergy, 2, " kWh"))}
            ${this._metric("mdi:current-ac", "Corrente L1", this._number(e.current, 1, " A"))}
            ${this._metric("mdi:sine-wave", "Tensione L1", this._number(e.voltage, 0, " V"))}
            ${this._metric("mdi:flash", "Potenza", this._number(e.rawPower, 0, " W"))}
            ${this._metric("mdi:current-ac", "Corrente massima", this._number(e.maxCurrent, 1, " A"))}
            ${this._metric("mdi:transmission-tower", "Corrente rete L1", this._number(e.gridCurrent, 1, " A"))}
            ${this._metric("mdi:alert-circle-outline", "Errore sistema", error.text, error.tone)}
          </div>
        </section>

        <section class="section">
          <div class="section-title">
            <ha-icon icon="mdi:thermometer-lines"></ha-icon>
            Diagnostica
          </div>
          <div class="metrics">
            ${this._metric("mdi:thermometer", "Case", this._number(e.caseTemp, 1, " °C"))}
            ${this._metric("mdi:thermometer-lines", "Scheda", this._number(e.boardTemp, 1, " °C"))}
            ${this._metric("mdi:fan", "Ventola", this._humanStatus(this._state(e.fan)))}
            ${this._metric("mdi:wifi", "Wi-Fi", this._wifiText(e))}
          </div>
        </section>

        <section class="section">
          <div class="section-title">
            <ha-icon icon="mdi:information-outline"></ha-icon>
            Informazioni DAZE
          </div>
          <div class="metrics">
            ${this._metric("mdi:cash", "Tariffa energetica", this._state(e.tariff))}
            ${this._metric("mdi:chip", "Firmware", this._state(e.firmware))}
            ${this._metric("mdi:application-cog-outline", "Software", this._state(e.software))}
            ${this._metric("mdi:shield-check-outline", "Integrazione", "ha-daze")}
          </div>
        </section>

        <div class="footer">
          <span>DAZE Dashboard</span>
          <span>·</span>
          <span>v0.4.0</span>
          <span>·</span>
          <span>Powered by ha-daze</span>
        </div>
      </main>
    `;
  }
}

if (!customElements.get("daze-dashboard-panel")) {
  customElements.define("daze-dashboard-panel", DazeDashboardPanel);
}

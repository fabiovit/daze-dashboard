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

  _state(entityId) {
    return this._hass?.states?.[entityId]?.state;
  }

  _valid(value) {
    return value !== undefined &&
      value !== null &&
      !["unknown", "unavailable", "none", ""].includes(String(value).toLowerCase());
  }

  _findEntities() {
    if (!this._hass) return {};

    const states = this._hass.states;
    const all = Object.keys(states);

    const findBySuffix = (suffix) =>
      all.find((id) => id.startsWith("sensor.") && id.endsWith(suffix));

    return {
      status:
        states["sensor.garage_25dt0102020_codice_stato"]
          ? "sensor.garage_25dt0102020_codice_stato"
          : findBySuffix("_codice_stato"),

      evse:
        states["sensor.garage_25dt0102020_codice_stato_evse"]
          ? "sensor.garage_25dt0102020_codice_stato_evse"
          : findBySuffix("_codice_stato_evse"),

      rawPower:
        states["sensor.garage_25dt0102020_potenza"]
          ? "sensor.garage_25dt0102020_potenza"
          : findBySuffix("_potenza"),

      sessionEnergy:
        states["sensor.garage_25dt0102020_energia_sessione"]
          ? "sensor.garage_25dt0102020_energia_sessione"
          : findBySuffix("_energia_sessione"),

      current:
        states["sensor.garage_25dt0102020_corrente_di_carica_l1"]
          ? "sensor.garage_25dt0102020_corrente_di_carica_l1"
          : findBySuffix("_corrente_di_carica_l1"),

      voltage:
        states["sensor.garage_25dt0102020_tensione_l1"]
          ? "sensor.garage_25dt0102020_tensione_l1"
          : findBySuffix("_tensione_l1"),

      maxCurrent:
        states["sensor.garage_25dt0102020_corrente_di_carica_massima"]
          ? "sensor.garage_25dt0102020_corrente_di_carica_massima"
          : findBySuffix("_corrente_di_carica_massima"),

      caseTemp:
        states["sensor.garage_25dt0102020_temperatura_case"]
          ? "sensor.garage_25dt0102020_temperatura_case"
          : findBySuffix("_temperatura_case"),

      boardTemp:
        states["sensor.garage_25dt0102020_temperatura_scheda"]
          ? "sensor.garage_25dt0102020_temperatura_scheda"
          : findBySuffix("_temperatura_scheda"),

      fan:
        states["sensor.garage_25dt0102020_stato_ventola"]
          ? "sensor.garage_25dt0102020_stato_ventola"
          : findBySuffix("_stato_ventola"),

      charging:
        states["binary_sensor.ev_in_carica_a_casa"]
          ? "binary_sensor.ev_in_carica_a_casa"
          : undefined,

      powerKw:
        states["sensor.daze_potenza_ricarica"]
          ? "sensor.daze_potenza_ricarica"
          : undefined,
    };
  }

  _format(entityId, decimals = 1, suffix = "") {
    if (!entityId) return "—";
    const value = this._state(entityId);
    if (!this._valid(value)) return "—";

    const number = Number(value);
    if (!Number.isFinite(number)) return `${value}${suffix}`;

    return `${number.toLocaleString("it-IT", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
  }

  _power(entities) {
    if (entities.powerKw) {
      return this._format(entities.powerKw, 2, " kW");
    }

    const raw = entities.rawPower ? Number(this._state(entities.rawPower)) : NaN;
    if (Number.isFinite(raw)) {
      return `${(raw / 1000).toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} kW`;
    }

    return "—";
  }

  _render() {
    if (!this.shadowRoot) return;

    if (!this._hass) {
      this.shadowRoot.innerHTML = `<div style="padding:24px">Caricamento DAZE Dashboard…</div>`;
      return;
    }

    const e = this._findEntities();
    const charging = e.charging && this._state(e.charging) === "on";
    const status = e.status ? this._state(e.status) : undefined;
    const evse = e.evse ? this._state(e.evse) : undefined;

    const stateLabel = charging
      ? "IN CARICA"
      : this._valid(evse)
        ? String(evse).toUpperCase()
        : "DAZE";

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
          max-width: 1180px;
          margin: 0 auto;
          padding: 24px;
        }

        .hero {
          border-radius: 28px;
          padding: 30px;
          border: 1px solid var(--divider-color);
          background:
            radial-gradient(circle at 85% 10%, rgba(3,169,244,.22), transparent 36%),
            var(--card-background-color);
          box-shadow: var(--ha-card-box-shadow, 0 8px 30px rgba(0,0,0,.08));
        }

        .kicker {
          font-size: 12px;
          letter-spacing: .18em;
          font-weight: 800;
          opacity: .55;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          align-items: center;
          margin-top: 8px;
        }

        h1 {
          margin: 0;
          font-size: clamp(38px, 7vw, 64px);
          letter-spacing: -.05em;
          line-height: 1;
        }

        .status {
          display: inline-flex;
          margin-top: 14px;
          padding: 9px 14px;
          border-radius: 999px;
          background: var(--secondary-background-color);
          font-weight: 850;
          letter-spacing: .05em;
          font-size: 13px;
        }

        .power {
          font-size: clamp(38px, 7vw, 70px);
          font-weight: 900;
          letter-spacing: -.06em;
          text-align: right;
        }

        .sub {
          opacity: .6;
          margin-top: 8px;
          font-weight: 650;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 18px;
        }

        .card {
          border-radius: 20px;
          padding: 18px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
        }

        .label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          opacity: .55;
        }

        .value {
          font-size: 23px;
          font-weight: 850;
          margin-top: 7px;
          overflow-wrap: anywhere;
        }

        .note {
          margin-top: 18px;
          border-radius: 18px;
          padding: 16px 18px;
          background: var(--secondary-background-color);
          opacity: .8;
        }

        @media (max-width: 800px) {
          .hero-grid {
            grid-template-columns: 1fr;
          }

          .power {
            text-align: left;
          }

          .grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 520px) {
          .page { padding: 14px; }
          .hero { padding: 22px; border-radius: 22px; }
          .grid { grid-template-columns: 1fr; }
        }
      </style>

      <main class="page">
        <section class="hero">
          <div class="kicker">HOME ASSISTANT · EV WALLBOX</div>

          <div class="hero-grid">
            <div>
              <h1>DAZE</h1>
              <div class="status">${stateLabel}</div>
              <div class="sub">${this._valid(status) ? status : "Rilevamento automatico entità attivo"}</div>
            </div>

            <div>
              <div class="power">${this._power(e)}</div>
              <div class="sub" style="text-align:right">
                ${charging ? "Potenza di ricarica" : "Potenza wallbox"}
              </div>
            </div>
          </div>
        </section>

        <section class="grid">
          <div class="card">
            <div class="label">Stato EVSE</div>
            <div class="value">${this._valid(evse) ? evse : "—"}</div>
          </div>

          <div class="card">
            <div class="label">Energia sessione</div>
            <div class="value">${this._format(e.sessionEnergy, 2, " kWh")}</div>
          </div>

          <div class="card">
            <div class="label">Corrente L1</div>
            <div class="value">${this._format(e.current, 1, " A")}</div>
          </div>

          <div class="card">
            <div class="label">Tensione L1</div>
            <div class="value">${this._format(e.voltage, 0, " V")}</div>
          </div>

          <div class="card">
            <div class="label">Corrente massima</div>
            <div class="value">${this._format(e.maxCurrent, 1, " A")}</div>
          </div>

          <div class="card">
            <div class="label">Ventola</div>
            <div class="value">${e.fan && this._valid(this._state(e.fan)) ? this._state(e.fan) : "—"}</div>
          </div>

          <div class="card">
            <div class="label">Temperatura case</div>
            <div class="value">${this._format(e.caseTemp, 1, " °C")}</div>
          </div>

          <div class="card">
            <div class="label">Temperatura scheda</div>
            <div class="value">${this._format(e.boardTemp, 1, " °C")}</div>
          </div>

          <div class="card">
            <div class="label">Ricarica Home Assistant</div>
            <div class="value">${e.charging ? (charging ? "Attiva" : "Non attiva") : "Sensore opzionale assente"}</div>
          </div>
        </section>

        <div class="note">
          v0.2.0 · Documentazione, HACS e riferimenti al progetto aggiornati. Il pannello legge gli stati già presenti in Home Assistant e non modifica ha-daze.
        </div>
      </main>
    `;
  }
}

if (!customElements.get("daze-dashboard-panel")) {
  customElements.define("daze-dashboard-panel", DazeDashboardPanel);
}

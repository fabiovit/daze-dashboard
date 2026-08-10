class DazeDashboardPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = undefined;
    this._data = undefined;
    this._unsubscribe = undefined;
    this._connecting = false;
    this._activeView = "overview";
    this._chargingStartedAt = null;
    this._lastCharging = false;
    this._timer = setInterval(() => {
      if (this._chargingStartedAt) this._render();
    }, 1000);
  }

  set hass(hass) {
    this._hass = hass;
    this._ensureSubscription();
    this._render();
  }

  set panel(panel) {
    this._panel = panel;
  }

  set narrow(narrow) {
    this._narrow = narrow;
  }

  set route(route) {
    this._route = route;
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = undefined;
    }
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = undefined;
    }
  }

  async _ensureSubscription() {
    if (!this._hass || this._unsubscribe || this._connecting) return;

    this._connecting = true;

    try {
      this._unsubscribe = await this._hass.connection.subscribeMessage(
        (event) => {
          this._data = event;

          const charging = this._isCharging();
          if (charging && !this._lastCharging) {
            this._chargingStartedAt = Date.now();
          } else if (!charging) {
            this._chargingStartedAt = null;
          }
          this._lastCharging = charging;

          this._render();
        },
        { type: "daze_dashboard/subscribe" }
      );
    } catch (err) {
      console.error("DAZE Dashboard subscription failed", err);
      this._data = { available: false, error: String(err), values: {} };
      this._render();
    } finally {
      this._connecting = false;
    }
  }

  _item(key) {
    return this._data?.values?.[key];
  }

  _state(key, fallback = "—") {
    const item = this._item(key);
    if (!item || item.available === false) return fallback;

    const value = item.state;
    if (
      value === undefined ||
      value === null ||
      ["unknown", "unavailable", "none", ""].includes(String(value).toLowerCase())
    ) {
      return fallback;
    }

    return value;
  }

  _number(key, decimals = 1, suffix = "") {
    const raw = this._state(key, null);
    if (raw === null) return "—";

    const n = Number(raw);
    if (!Number.isFinite(n)) return `${raw}${suffix}`;

    return `${n.toLocaleString("it-IT", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
  }

  _watts() {
    const n = Number(this._state("power", "NaN"));
    return Number.isFinite(n) ? n : NaN;
  }

  _power() {
    const watts = this._watts();
    if (!Number.isFinite(watts)) return "—";

    return `${(watts / 1000).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  _isCharging() {
    const watts = this._watts();
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

  _statusTone() {
    if (this._isCharging()) return "charging";

    const evse = String(this._state("evse_state", "")).toLowerCase();
    if (!evse) return "offline";
    if (evse.includes("standby") || evse.includes("idle") || evse.includes("attesa")) return "idle";
    if (evse.includes("fault") || evse.includes("error")) return "offline";
    return "connected";
  }

  _statusAccent() {
    const tone = this._statusTone();
    if (tone === "charging") return "#f59e0b";
    if (tone === "connected") return "#3b82f6";
    if (tone === "offline") return "#ef4444";
    return "#64748b";
  }

  _errorInfo() {
    const raw = this._state("system_error", "—");
    const l = String(raw).toLowerCase();

    if (raw === "—") return { text: "Non disponibile", tone: "neutral" };
    if (l.includes("none") || l.includes("nessun") || l.includes("no error") || l === "ok") {
      return { text: "Nessun errore", tone: "ok" };
    }

    return { text: raw, tone: "bad" };
  }

  _wifiText() {
    const raw = this._state("wifi_ssid", null);
    return raw === null ? "Non disponibile" : "Connesso";
  }

  _tariff() {
    const item = this._item("tariff");
    if (!item || item.available === false) return "—";

    const n = Number(item.state);
    if (!Number.isFinite(n)) return item.state ?? "—";

    const symbol = item.currency_symbol || item.currency_code || "";
    return `${n.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}${symbol ? ` ${symbol}` : ""}`;
  }

  _powerPercent() {
    const watts = this._watts();
    const current = Number(this._state("max_charging_current", "NaN"));
    const voltage = Number(this._state("voltage_l1", "NaN"));

    if (!Number.isFinite(watts) || !Number.isFinite(current) || !Number.isFinite(voltage)) {
      return 0;
    }

    const maxWatts = current * voltage;
    if (maxWatts <= 0) return 0;

    return Math.max(0, Math.min(100, (watts / maxWatts) * 100));
  }

  _elapsed() {
    if (!this._chargingStartedAt) return "—";
    const seconds = Math.max(0, Math.floor((Date.now() - this._chargingStartedAt) / 1000));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  _tempStatus(key, warn, critical) {
    const n = Number(this._state(key, "NaN"));
    if (!Number.isFinite(n)) return { label: "Non disponibile", tone: "neutral" };
    if (n >= critical) return { label: "Critica", tone: "bad" };
    if (n >= warn) return { label: "Elevata", tone: "warn" };
    return { label: "OK", tone: "ok" };
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

  _diagRow(icon, label, value, status, tone = "neutral") {
    return `
      <div class="diag-row">
        <div class="diag-icon"><ha-icon icon="${icon}"></ha-icon></div>
        <div class="diag-main">
          <div class="diag-label">${label}</div>
          <div class="diag-value">${value}</div>
        </div>
        <div class="diag-status ${tone}">${status}</div>
      </div>
    `;
  }

  _navButton(view, icon, label) {
    return `
      <button class="nav-button ${this._activeView === view ? "active" : ""}" data-view="${view}">
        <ha-icon icon="${icon}"></ha-icon>
        <span>${label}</span>
      </button>
    `;
  }

  _bindEvents() {
    this.shadowRoot.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        this._activeView = button.dataset.view;
        this._render();
      });
    });
  }

  _renderOverview(evse, error, charging) {
    return `
      <section class="overview-grid">
        <div class="feature-card energy-card">
          <div class="feature-label">Energia sessione</div>
          <div class="feature-value">${this._number("session_energy", 2, " kWh")}</div>
          <div class="feature-caption">${charging ? `Sessione attiva · ${this._elapsed()}` : "Ultima sessione / sessione corrente"}</div>
        </div>

        <div class="feature-card">
          <div class="feature-label">Stato EVSE</div>
          <div class="feature-value small">${evse}</div>
          <div class="feature-caption">Stato operativo della presa</div>
        </div>

        <div class="feature-card">
          <div class="feature-label">Corrente</div>
          <div class="feature-value">${this._number("charging_current_l1", 1, " A")}</div>
          <div class="feature-caption">Limite ${this._number("max_charging_current", 1, " A")}</div>
        </div>

        <div class="feature-card">
          <div class="feature-label">Tensione</div>
          <div class="feature-value">${this._number("voltage_l1", 0, " V")}</div>
          <div class="feature-caption">Linea L1</div>
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <ha-icon icon="mdi:flash-outline"></ha-icon>
          Elettrico
        </div>
        <div class="metrics">
          ${this._metric("mdi:flash", "Potenza", this._number("power", 0, " W"))}
          ${this._metric("mdi:transmission-tower", "Corrente rete L1", this._number("grid_current_l1", 1, " A"))}
          ${this._metric("mdi:current-ac", "Corrente massima", this._number("max_charging_current", 1, " A"))}
          ${this._metric("mdi:alert-circle-outline", "Errore sistema", error.text, error.tone)}
        </div>
      </section>
    `;
  }

  _renderDiagnostics() {
    const caseState = this._tempStatus("case_temperature", 45, 60);
    const boardState = this._tempStatus("board_temperature", 55, 70);
    const error = this._errorInfo();

    return `
      <section class="section">
        <div class="section-title">
          <ha-icon icon="mdi:stethoscope"></ha-icon>
          Diagnostica intelligente
        </div>

        <div class="diag-list">
          ${this._diagRow(
            "mdi:thermometer",
            "Temperatura case",
            this._number("case_temperature", 1, " °C"),
            caseState.label,
            caseState.tone
          )}

          ${this._diagRow(
            "mdi:thermometer-lines",
            "Temperatura scheda",
            this._number("board_temperature", 1, " °C"),
            boardState.label,
            boardState.tone
          )}

          ${this._diagRow(
            "mdi:fan",
            "Ventola",
            this._humanStatus(this._state("fan_status")),
            this._state("fan_status", null) === null ? "N/D" : "Disponibile",
            this._state("fan_status", null) === null ? "neutral" : "ok"
          )}

          ${this._diagRow(
            "mdi:wifi",
            "Wi-Fi",
            this._wifiText(),
            this._state("wifi_ssid", null) === null ? "N/D" : "OK",
            this._state("wifi_ssid", null) === null ? "neutral" : "ok"
          )}

          ${this._diagRow(
            "mdi:alert-circle-outline",
            "Sistema",
            error.text,
            error.tone === "ok" ? "OK" : error.tone === "bad" ? "Attenzione" : "N/D",
            error.tone
          )}
        </div>
      </section>
    `;
  }

  _renderInfo() {
    return `
      <section class="section">
        <div class="section-title">
          <ha-icon icon="mdi:information-outline"></ha-icon>
          Informazioni DAZE
        </div>
        <div class="metrics">
          ${this._metric("mdi:cash", "Tariffa energetica", this._tariff())}
          ${this._metric("mdi:chip", "Firmware", this._state("firmware_version"))}
          ${this._metric("mdi:application-cog-outline", "Software", this._state("software_version"))}
          ${this._metric("mdi:shield-check-outline", "Integrazione", "ha-daze")}
        </div>
      </section>

      <section class="section compact">
        <div class="section-title">
          <ha-icon icon="mdi:information-variant"></ha-icon>
          Progetto
        </div>
        <div class="project-line">
          <span>DAZE Dashboard</span>
          <strong>v0.6.0</strong>
        </div>
        <div class="project-line">
          <span>Backend dati</span>
          <strong>ha-daze</strong>
        </div>
        <div class="project-note">
          DAZE Dashboard legge esclusivamente i dati già disponibili in Home Assistant e non aggiunge polling verso il cloud DAZE.
        </div>
      </section>
    `;
  }

  _render() {
    if (!this.shadowRoot) return;

    if (!this._data) {
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block;min-height:100%;background:var(--primary-background-color);color:var(--primary-text-color)}
          .loading{padding:40px;font:600 16px system-ui;opacity:.7}
        </style>
        <div class="loading">Connessione a DAZE Dashboard…</div>
      `;
      return;
    }

    const charging = this._isCharging();
    const status = this._humanStatus(this._state("status"));
    const evse = this._humanStatus(this._state("evse_state"));
    const tone = this._statusTone();
    const accent = this._statusAccent();
    const error = this._errorInfo();
    const heroLabel = charging ? "IN CARICA" : evse.toUpperCase();
    const powerPercent = this._powerPercent();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --daze-accent: ${accent};
          display: block;
          min-height: 100%;
          background: var(--primary-background-color);
          color: var(--primary-text-color);
          font-family: var(--paper-font-body1_-_font-family, system-ui, sans-serif);
        }

        * { box-sizing: border-box; }

        button { font: inherit; }

        .page {
          max-width: 1240px;
          margin: 0 auto;
          padding: 24px;
        }

        .hero {
          position: relative;
          border-radius: 32px;
          padding: 36px;
          border: 1px solid var(--divider-color);
          background:
            radial-gradient(circle at 82% 8%, color-mix(in srgb, var(--daze-accent) 24%, transparent), transparent 38%),
            radial-gradient(circle at 10% 110%, rgba(99,102,241,.12), transparent 42%),
            var(--card-background-color);
          box-shadow: var(--ha-card-box-shadow, 0 10px 36px rgba(0,0,0,.08));
          overflow: hidden;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 32px;
        }

        .kicker {
          font-size: 11px;
          font-weight: 850;
          letter-spacing: .18em;
          opacity: .52;
          margin-bottom: 10px;
        }

        h1 {
          margin: 0;
          font-size: clamp(46px, 7vw, 76px);
          letter-spacing: -.065em;
          line-height: .9;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-top: 18px;
          padding: 9px 14px;
          border-radius: 999px;
          background: var(--secondary-background-color);
          font-size: 13px;
          font-weight: 850;
          letter-spacing: .05em;
          color: var(--daze-accent);
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: currentColor;
        }

        .charging .dot {
          animation: pulse 1.6s ease-in-out infinite;
        }

        @keyframes pulse {
          0%,100% { opacity:.45; transform:scale(.85); }
          50% { opacity:1; transform:scale(1.25); }
        }

        .hero-status {
          margin-top: 12px;
          opacity: .68;
          font-weight: 650;
        }

        .power-block {
          text-align: right;
          min-width: 360px;
        }

        .power-row {
          display: flex;
          justify-content: flex-end;
          align-items: baseline;
          gap: 10px;
        }

        .power {
          font-size: clamp(60px, 10vw, 100px);
          line-height: .82;
          font-weight: 950;
          letter-spacing: -.075em;
        }

        .power-unit {
          font-size: clamp(24px, 3vw, 38px);
          font-weight: 850;
          opacity: .72;
        }

        .power-sub {
          margin-top: 12px;
          opacity: .58;
          font-weight: 700;
        }

        .power-track {
          width: 100%;
          height: 8px;
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
          background: linear-gradient(90deg, var(--daze-accent), #22c55e);
          transition: width .45s ease;
        }

        .session-strip {
          display: flex;
          justify-content: flex-end;
          gap: 20px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .session-item {
          text-align: right;
        }

        .session-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .08em;
          opacity: .48;
          font-weight: 800;
        }

        .session-value {
          margin-top: 3px;
          font-size: 16px;
          font-weight: 850;
        }

        .nav {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          padding: 5px;
          border-radius: 16px;
          background: var(--card-background-color);
          border: 1px solid var(--divider-color);
          width: fit-content;
          max-width: 100%;
        }

        .nav-button {
          border: 0;
          color: var(--secondary-text-color);
          background: transparent;
          padding: 10px 14px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 750;
        }

        .nav-button.active {
          color: var(--primary-text-color);
          background: var(--secondary-background-color);
        }

        .overview-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 14px;
          margin-top: 18px;
        }

        .feature-card {
          min-width: 0;
          border-radius: 22px;
          padding: 20px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
        }

        .energy-card {
          background:
            radial-gradient(circle at 90% 10%, color-mix(in srgb, var(--daze-accent) 14%, transparent), transparent 45%),
            var(--card-background-color);
        }

        .feature-label {
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .08em;
          text-transform: uppercase;
          opacity: .5;
        }

        .feature-value {
          font-size: clamp(28px, 4vw, 44px);
          font-weight: 900;
          letter-spacing: -.04em;
          margin-top: 8px;
        }

        .feature-value.small {
          font-size: 26px;
        }

        .feature-caption {
          margin-top: 8px;
          font-size: 12px;
          opacity: .54;
          font-weight: 650;
        }

        .section {
          margin-top: 18px;
          background: var(--card-background-color);
          border: 1px solid var(--divider-color);
          border-radius: 24px;
          padding: 20px;
        }

        .section.compact { max-width: 720px; }

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

        .metric-icon, .diag-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: var(--daze-accent);
          background: color-mix(in srgb, var(--daze-accent) 12%, transparent);
        }

        .metric-content { min-width: 0; }

        .metric-label, .diag-label {
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .08em;
          text-transform: uppercase;
          opacity: .55;
        }

        .metric-value, .diag-value {
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

        .diag-list {
          display: grid;
          gap: 10px;
        }

        .diag-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          border-radius: 18px;
          background: var(--secondary-background-color);
        }

        .diag-main {
          min-width: 0;
          flex: 1;
        }

        .diag-status {
          flex: 0 0 auto;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 850;
          background: var(--card-background-color);
        }

        .diag-status.ok { color: #22c55e; }
        .diag-status.warn { color: #f59e0b; }
        .diag-status.bad { color: #ef4444; }
        .diag-status.neutral { color: var(--secondary-text-color); }

        .project-line {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          padding: 11px 0;
          border-bottom: 1px solid var(--divider-color);
        }

        .project-line:last-of-type { border-bottom: 0; }

        .project-note {
          margin-top: 14px;
          font-size: 12px;
          opacity: .58;
          line-height: 1.5;
        }

        .notice {
          margin-top: 18px;
          border-radius: 18px;
          padding: 16px 18px;
          background: var(--secondary-background-color);
          opacity: .8;
        }

        .footer {
          display: flex;
          justify-content: center;
          gap: 8px;
          align-items: center;
          font-size: 12px;
          opacity: .5;
          margin: 18px 0 6px;
        }

        @media (max-width: 1020px) {
          .overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .energy-card { grid-column: span 2; }
          .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 760px) {
          .hero-grid { grid-template-columns: 1fr; }
          .power-block { text-align: left; min-width: 0; }
          .power-row { justify-content: flex-start; }
          .session-strip { justify-content: flex-start; }
          .session-item { text-align: left; }
        }

        @media (max-width: 540px) {
          .page { padding: 14px; }
          .hero { padding: 22px; border-radius: 22px; }
          .section { border-radius: 20px; padding: 15px; }
          .overview-grid, .metrics { grid-template-columns: 1fr; }
          .energy-card { grid-column: auto; }
          .nav { width: 100%; }
          .nav-button { flex: 1; justify-content: center; padding: 10px 8px; }
          .nav-button span { font-size: 12px; }
        }
      </style>

      <main class="page">
        <section class="hero ${tone}">
          <div class="hero-grid">
            <div>
              <div class="kicker">HOME ASSISTANT · DAZE WALLBOX</div>
              <h1>DAZE</h1>
              <div class="status-pill">
                <span class="dot"></span>
                ${heroLabel}
              </div>
              <div class="hero-status">${status}</div>
            </div>

            <div class="power-block">
              <div class="power-row">
                <div class="power">${this._power()}</div>
                <div class="power-unit">kW</div>
              </div>
              <div class="power-sub">${charging ? "Potenza di ricarica" : "Potenza wallbox"}</div>
              <div class="power-track">
                <div class="power-fill"></div>
              </div>

              <div class="session-strip">
                <div class="session-item">
                  <div class="session-label">Energia</div>
                  <div class="session-value">${this._number("session_energy", 2, " kWh")}</div>
                </div>
                <div class="session-item">
                  <div class="session-label">Tempo live</div>
                  <div class="session-value">${charging ? this._elapsed() : "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <nav class="nav">
          ${this._navButton("overview", "mdi:view-dashboard-outline", "Panoramica")}
          ${this._navButton("diagnostics", "mdi:stethoscope", "Diagnostica")}
          ${this._navButton("info", "mdi:information-outline", "Informazioni")}
        </nav>

        ${this._data.available ? (
          this._activeView === "diagnostics"
            ? this._renderDiagnostics()
            : this._activeView === "info"
              ? this._renderInfo()
              : this._renderOverview(evse, error, charging)
        ) : `
          <div class="notice">
            Nessuna entità compatibile con ha-daze è stata rilevata. Installa e configura prima l'integrazione ha-daze.
          </div>
        `}

        <div class="footer">
          <span>DAZE Dashboard</span>
          <span>·</span>
          <span>v0.6.0</span>
          <span>·</span>
          <span>Powered by ha-daze</span>
        </div>
      </main>
    `;

    this._bindEvents();
  }
}

if (!customElements.get("daze-dashboard-panel")) {
  customElements.define("daze-dashboard-panel", DazeDashboardPanel);
}

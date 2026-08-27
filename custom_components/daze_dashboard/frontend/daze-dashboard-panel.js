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
    this._samples = [];
    this._lastSampleAt = 0;
    this._language = localStorage.getItem("daze-dashboard-language") || "auto";

    this._timer = setInterval(() => {
      if (this._data) {
        this._samplePower();
        if (this._chargingStartedAt) this._render();
      }
    }, 1000);
  }

  set hass(hass) {
    this._hass = hass;
    this._ensureSubscription();
    this._render();
  }

  set panel(panel) { this._panel = panel; }
  set narrow(narrow) { this._narrow = narrow; }
  set route(route) { this._route = route; }

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

          this._samplePower(true);
          this._render();
        },
        { type: "daze_dashboard/subscribe" }
      );
    } catch (err) {
      console.error("DAZE Dashboard subscription failed", err);
      this._data = { available: false, error: String(err), values: {}, options: {} };
      this._render();
    } finally {
      this._connecting = false;
    }
  }


  _resolvedLanguage() {
    if (this._language === "it" || this._language === "en") return this._language;
    const language = this._hass?.locale?.language || this._hass?.language || navigator.language || "en";
    return String(language).toLowerCase().startsWith("it") ? "it" : "en";
  }

  _locale() {
    return this._resolvedLanguage() === "it" ? "it-IT" : "en-GB";
  }

  _tr(text) {
    const translations = {
      "Panoramica": "Overview",
      "Diagnostica": "Diagnostics",
      "Informazioni": "Information",
      "Energia in tempo reale": "Real-time energy",
      "Wallbox DAZE · aggiornamento live da Home Assistant": "DAZE wallbox · live updates from Home Assistant",
      "Energia sessione": "Session energy",
      "Durata": "Duration",
      "Costo stimato": "Estimated cost",
      "Potenza": "Power",
      "del limite": "of limit",
      "Ricarica attiva": "Charging",
      "Auto collegata": "Vehicle connected",
      "Non disponibile": "Unavailable",
      "In attesa": "Waiting",
      "In carica": "Charging",
      "Carica completata": "Charge complete",
      "Errore": "Error",
      "Nessun errore": "No errors",
      "Connesso": "Connected",
      "Critica": "Critical",
      "Elevata": "High",
      "Potenza ricarica": "Charging power",
      "Carico contatore": "Grid load",
      "Limite ricarica": "Charging limit",
      "Errore sistema": "System error",
      "Temperatura case": "Case temperature",
      "Temperatura scheda": "Board temperature",
      "Ventola": "Fan",
      "Wi-Fi": "Wi-Fi",
      "Sistema": "System",
      "Tariffa energetica": "Energy tariff",
      "Firmware": "Firmware",
      "Software": "Software",
      "Integrazione": "Integration",
      "Diagnostica intelligente": "Smart diagnostics",
      "Informazioni DAZE": "DAZE information",
      "Preferenze pannello": "Panel preferences",
      "Grafico live": "Live chart",
      "Statistiche sessione": "Session statistics",
      "Tema": "Theme",
      "Attivo": "Enabled",
      "Disattivato": "Disabled",
      "Attive": "Enabled",
      "Disattivate": "Disabled",
      "Attiva": "Enabled",
      "Disattivata": "Disabled",
      "Supporta DAZE Dashboard": "Support DAZE Dashboard",
      "Offrimi un caffè": "Buy me a coffee",
      "Se DAZE Dashboard ti piace e vuoi supportarne lo sviluppo, puoi offrirmi un caffè su Ko-fi.": "If you enjoy DAZE Dashboard and want to support its development, you can buy me a coffee on Ko-fi.",
      "Modifica queste preferenze da Impostazioni → Dispositivi e servizi → DAZE Dashboard → Configura. Nessun YAML richiesto.": "Change these preferences from Settings → Devices & services → DAZE Dashboard → Configure. No YAML required."
    };
    return this._resolvedLanguage() === "it" ? text : (translations[text] || text);
  }

  _setLanguage(language) {
    this._language = ["auto", "it", "en"].includes(language) ? language : "auto";
    localStorage.setItem("daze-dashboard-language", this._language);
    this._render();
  }

  _languageSelector() {
    return `
      <div class="language-selector" aria-label="Language">
        <button class="${this._language === "auto" ? "active" : ""}" data-language="auto">Auto</button>
        <button class="${this._language === "it" ? "active" : ""}" data-language="it">🇮🇹 IT</button>
        <button class="${this._language === "en" ? "active" : ""}" data-language="en">🇬🇧 EN</button>
      </div>
    `;
  }

  _dashboardVersion() {
    return this._panel?.config?.version || "—";
  }

  _options() {
    return {
      show_chart: this._data?.options?.show_chart !== false,
      show_diagnostics: this._data?.options?.show_diagnostics !== false,
      show_session_stats: this._data?.options?.show_session_stats !== false,
      theme: this._data?.options?.theme || "auto",
    };
  }

  _item(key) { return this._data?.values?.[key]; }

  _state(key, fallback = "—") {
    const item = this._item(key);
    if (!item || item.available === false) return fallback;

    const value = item.state;
    if (
      value === undefined ||
      value === null ||
      ["unknown", "unavailable", "none", ""].includes(String(value).toLowerCase())
    ) return fallback;

    return value;
  }

  _hasValue(key) {
    return this._state(key, null) !== null;
  }

  _number(key, decimals = 1, suffix = "") {
    const raw = this._state(key, null);
    if (raw === null) return "—";

    const n = Number(raw);
    if (!Number.isFinite(n)) return `${raw}${suffix}`;

    return `${n.toLocaleString(this._locale(), {
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
    return (watts / 1000).toLocaleString(this._locale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  _valueUnit(value, unit) {
    if (value === "—" || value === null || value === undefined) return "—";
    return `<span class="value-number">${value}</span><span class="value-unit">${unit}</span>`;
  }

  _chargingPowerHtml() {
    return this._valueUnit(this._power(), "kW");
  }

  _sessionEnergyHtml() {
    const raw = this._state("session_energy", null);
    if (raw === null) return "—";
    const n = Number(raw);
    if (!Number.isFinite(n)) return `${raw}`;
    const value = n.toLocaleString(this._locale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return this._valueUnit(value, "kWh");
  }

  _powerFromCurrent(currentKey) {
    const current = Number(this._state(currentKey, "NaN"));
    const voltage = Number(this._state("voltage_l1", "NaN"));
    if (!Number.isFinite(current) || !Number.isFinite(voltage)) return "—";
    return ((current * voltage) / 1000).toLocaleString(this._locale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  _limitPowerHtml() {
    return this._valueUnit(this._powerFromCurrent("max_charging_current"), "kW");
  }

  _gridPowerHtml() {
    return this._valueUnit(this._powerFromCurrent("grid_current_l1"), "kW");
  }

  _isCharging() {
    const watts = this._watts();
    return Number.isFinite(watts) && watts > 300;
  }

  _samplePower(force = false) {
    const now = Date.now();
    if (!force && now - this._lastSampleAt < 5000) return;

    const watts = this._watts();
    if (!Number.isFinite(watts)) return;

    this._lastSampleAt = now;
    this._samples.push({ t: now, kw: watts / 1000 });

    const cutoff = now - 5 * 60 * 1000;
    this._samples = this._samples.filter((sample) => sample.t >= cutoff);
    if (this._samples.length > 61) this._samples = this._samples.slice(-61);
  }

  _humanStatus(value) {
    if (!value || value === "—") return this._tr("Non disponibile");
    const s = String(value).trim();
    const l = s.toLowerCase();

    if (["standby", "idle", "waiting", "in attesa"].includes(l)) return this._tr("In attesa");
    if (l.includes("charg")) return this._tr("In carica");
    if (l.includes("connected") || l.includes("colleg")) return this._tr("Auto collegata");
    if (l.includes("complete") || l.includes("terminat") || l.includes("finished")) return this._tr("Carica completata");
    if (l.includes("fault") || l.includes("error") || l.includes("errore")) return this._tr("Errore");

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

  _chargingPulseClass() {
    return this._isCharging() ? "is-charging" : "";
  }

  _statusIcon() {
    const tone = this._statusTone();
    if (tone === "charging") return "mdi:ev-station";
    if (tone === "connected") return "mdi:ev-plug-type2";
    if (tone === "offline") return "mdi:alert-circle-outline";
    return "mdi:power-plug-outline";
  }

  _statusLabel() {
    const tone = this._statusTone();
    if (tone === "charging") return this._tr("Ricarica attiva");
    if (tone === "connected") return this._tr("Auto collegata");
    if (tone === "offline") return this._tr("Non disponibile");
    return this._tr("In attesa");
  }

  _heroProgress() {
    const pct = this._powerPercent();
    return Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  }

  _errorInfo() {
    const raw = this._state("system_error", "—");
    const l = String(raw).toLowerCase();

    if (raw === "—") return { text: this._tr("Non disponibile"), tone: "neutral" };
    if (l.includes("none") || l.includes("nessun") || l.includes("no error") || l === "ok") {
      return { text: this._tr("Nessun errore"), tone: "ok" };
    }
    return { text: raw, tone: "bad" };
  }

  _wifiText() {
    return this._state("wifi_ssid", null) === null ? this._tr("Non disponibile") : this._tr("Connesso");
  }

  _tariffNumber() {
    const item = this._item("tariff");
    if (!item || item.available === false) return NaN;
    const n = Number(item.state);
    return Number.isFinite(n) ? n : NaN;
  }

  _tariff() {
    const item = this._item("tariff");
    if (!item || item.available === false) return "—";
    const n = Number(item.state);
    if (!Number.isFinite(n)) return item.state ?? "—";

    const symbol = item.currency_symbol || item.currency_code || "";
    return `${n.toLocaleString(this._locale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}${symbol ? ` ${symbol}` : ""}`;
  }

  _estimatedCost() {
    const energy = Number(this._state("session_energy", "NaN"));
    const tariff = this._tariffNumber();

    if (!Number.isFinite(energy) || !Number.isFinite(tariff)) return "—";

    return `${(energy * tariff).toLocaleString(this._locale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }

  _liveAveragePower() {
    if (!this._samples.length) return "—";
    const avg = this._samples.reduce((sum, sample) => sum + sample.kw, 0) / this._samples.length;
    return `${avg.toLocaleString(this._locale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kW`;
  }

  _powerPercent() {
    const watts = this._watts();
    const current = Number(this._state("max_charging_current", "NaN"));
    const voltage = Number(this._state("voltage_l1", "NaN"));

    if (!Number.isFinite(watts) || !Number.isFinite(current) || !Number.isFinite(voltage)) return 0;
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

    return h > 0
      ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  _tempStatus(key, warn, critical) {
    const n = Number(this._state(key, "NaN"));
    if (!Number.isFinite(n)) return { label: this._tr("Non disponibile"), tone: "neutral", pct: 0 };
    if (n >= critical) return { label: this._tr("Critica"), tone: "bad", pct: 100 };
    if (n >= warn) return { label: this._tr("Elevata"), tone: "warn", pct: Math.min(100, n / critical * 100) };
    return { label: "OK", tone: "ok", pct: Math.min(100, n / critical * 100) };
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

  _metricDetail(icon, label, value, detail, extraClass = "") {
    return `
      <div class="metric metric-detail ${extraClass}">
        <div class="metric-icon"><ha-icon icon="${icon}"></ha-icon></div>
        <div class="metric-content">
          <div class="metric-label">${label}</div>
          <div class="metric-value">${value}</div>
          <div class="metric-detail-line">${detail}</div>
        </div>
      </div>
    `;
  }

  _diagRow(icon, label, value, status, tone = "neutral", pct = null) {
    return `
      <div class="diag-row">
        <div class="diag-icon"><ha-icon icon="${icon}"></ha-icon></div>
        <div class="diag-main">
          <div class="diag-label">${label}</div>
          <div class="diag-value">${value}</div>
          ${pct === null ? "" : `
            <div class="diag-track">
              <div class="diag-fill ${tone}" style="width:${pct}%"></div>
            </div>
          `}
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

  _toggleSidebar() {
    this.dispatchEvent(
      new CustomEvent("hass-toggle-menu", {
        bubbles: true,
        composed: true,
      })
    );
  }

  _bindEvents() {
    const menuButton = this.shadowRoot.querySelector("[data-menu-toggle]");
    if (menuButton) {
      menuButton.addEventListener("click", () => this._toggleSidebar());
    }

    this.shadowRoot.querySelectorAll("[data-language]").forEach((button) => {
      button.addEventListener("click", () => this._setLanguage(button.dataset.language));
    });

    this.shadowRoot.querySelectorAll(".nav .nav-button[data-view]").forEach((button) => {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchMoved = false;
      let handledByTouch = false;

      button.addEventListener("touchstart", (ev) => {
        if (ev.touches?.length !== 1) return;
        touchStartX = ev.touches[0].clientX;
        touchStartY = ev.touches[0].clientY;
        touchMoved = false;
        handledByTouch = false;
      }, { passive: true });

      button.addEventListener("touchmove", (ev) => {
        if (ev.touches?.length !== 1) return;
        const dx = Math.abs(ev.touches[0].clientX - touchStartX);
        const dy = Math.abs(ev.touches[0].clientY - touchStartY);
        if (dx > 10 || dy > 10) touchMoved = true;
      }, { passive: true });

      button.addEventListener("touchend", (ev) => {
        if (touchMoved) return;
        handledByTouch = true;
        ev.preventDefault();
        this._activeView = button.dataset.view;
        this._render();
        setTimeout(() => { handledByTouch = false; }, 350);
      }, { passive: false });

      button.addEventListener("click", (ev) => {
        if (handledByTouch) {
          ev.preventDefault();
          ev.stopPropagation();
          return;
        }
        this._activeView = button.dataset.view;
        this._render();
      });
    });
  }

  _chartSvg() {
    const samples = this._samples;
    const width = 1000;
    const height = 230;
    const pad = 18;

    if (!samples.length) {
      return `<div class="chart-empty">Il grafico live inizierà appena saranno disponibili campioni di potenza.</div>`;
    }

    const maxKw = Math.max(1, ...samples.map((s) => s.kw)) * 1.12;
    const minT = samples[0].t;
    const maxT = samples[samples.length - 1].t;
    const span = Math.max(1, maxT - minT);

    const points = samples.map((s) => {
      const x = pad + ((s.t - minT) / span) * (width - pad * 2);
      const y = height - pad - (s.kw / maxKw) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");

    const last = samples[samples.length - 1];
    const lastY = height - pad - (last.kw / maxKw) * (height - pad * 2);

    return `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Grafico live potenza">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--daze-accent)" stop-opacity=".30"></stop>
            <stop offset="100%" stop-color="var(--daze-accent)" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
        <line x1="${pad}" y1="${height-pad}" x2="${width-pad}" y2="${height-pad}" class="chart-axis"></line>
        <polygon points="${pad},${height-pad} ${points} ${width-pad},${height-pad}" fill="url(#areaGradient)"></polygon>
        <polyline points="${points}" class="chart-line"></polyline>
        <circle cx="${width-pad}" cy="${lastY}" r="5" class="chart-dot"></circle>
      </svg>
      <div class="chart-legend">
        <span>Ultimi 5 minuti · campione ogni 5 s</span>
        <strong>${last.kw.toLocaleString(this._locale(), {minimumFractionDigits:2, maximumFractionDigits:2})} kW</strong>
      </div>
    `;
  }

  _renderOverview(evse, error, charging) {
    const opts = this._options();

    return `
      ${opts.show_session_stats ? `
        <section class="session-grid">
          <div class="session-card primary-stat">
            <div class="feature-label">${this._tr("Energia sessione")}</div>
            <div class="feature-value">${this._sessionEnergyHtml()}</div>
            <div class="feature-caption">${charging ? "Sessione attiva" : "Sessione corrente / ultima lettura"}</div>
          </div>
          <div class="session-card">
            <div class="feature-label">Tempo live</div>
            <div class="feature-value medium">${charging ? this._elapsed() : "—"}</div>
            <div class="feature-caption">Da quando il pannello rileva la carica</div>
          </div>
          <div class="session-card">
            <div class="feature-label">Media live</div>
            <div class="feature-value medium">${this._liveAveragePower()}</div>
            <div class="feature-caption">Media campioni del pannello</div>
          </div>
          <div class="session-card">
            <div class="feature-label">${this._tr("Costo stimato")}</div>
            <div class="feature-value medium">${this._estimatedCost()}</div>
            <div class="feature-caption">Energia sessione × tariffa DAZE</div>
          </div>
        </section>
      ` : ""}

      ${opts.show_chart ? `
        <section class="section chart-section">
          <div class="section-title">
            <ha-icon icon="mdi:chart-line"></ha-icon>
            Potenza live
          </div>
          ${this._chartSvg()}
        </section>
      ` : ""}

      <section class="overview-grid">
        <div class="feature-card">
          <div class="feature-label">Stato EVSE</div>
          <div class="feature-value small">${evse}</div>
          <div class="feature-caption">Stato operativo della presa</div>
        </div>
        <div class="feature-card">
          <div class="feature-label">Potenza ricarica</div>
          <div class="feature-value">${this._chargingPowerHtml()}</div>
          <div class="feature-caption">
            ${this._number("charging_current_l1", 1, " A")} ·
            ${this._number("voltage_l1", 0, " V")}
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-label">Limite ricarica</div>
          <div class="feature-value">${this._limitPowerHtml()}</div>
          <div class="feature-caption">
            ${this._number("max_charging_current", 1, " A")} · Limite DAZE
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <ha-icon icon="mdi:flash-outline"></ha-icon>
          Elettrico
        </div>
        <div class="metrics">
          ${this._metricDetail(
            "mdi:flash",
            "Potenza ricarica",
            this._chargingPowerHtml(),
            `${this._number("charging_current_l1", 1, " A")} · ${this._number("voltage_l1", 0, " V")}`
          )}
          ${this._metricDetail(
            "mdi:transmission-tower",
            "Carico contatore",
            this._gridPowerHtml(),
            `${this._number("grid_current_l1", 1, " A")} · ${this._number("voltage_l1", 0, " V")}`
          )}
          ${this._metricDetail(
            "mdi:speedometer",
            "Limite ricarica",
            this._limitPowerHtml(),
            `${this._number("max_charging_current", 1, " A")} · Limite DAZE`
          )}
          ${this._metric("mdi:alert-circle-outline", this._tr("Errore sistema"), error.text, error.tone)}
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
          ${this._hasValue("case_temperature") ? this._diagRow(
            "mdi:thermometer",
            "Temperatura case",
            this._number("case_temperature", 1, " °C"),
            caseState.label,
            caseState.tone,
            caseState.pct
          ) : ""}
          ${this._hasValue("board_temperature") ? this._diagRow(
            "mdi:thermometer-lines",
            "Temperatura scheda",
            this._number("board_temperature", 1, " °C"),
            boardState.label,
            boardState.tone,
            boardState.pct
          ) : ""}
          ${this._hasValue("fan_status") ? this._diagRow(
            "mdi:fan",
            "Ventola",
            this._humanStatus(this._state("fan_status")),
            "Disponibile",
            "ok"
          ) : ""}
          ${this._hasValue("wifi_ssid") ? this._diagRow(
            "mdi:wifi",
            "Wi-Fi",
            this._wifiText(),
            "OK",
            "ok"
          ) : ""}
          ${this._hasValue("system_error") ? this._diagRow(
            "mdi:alert-circle-outline",
            "Sistema",
            error.text,
            error.tone === "ok" ? "OK" : error.tone === "bad" ? "Attenzione" : "",
            error.tone
          ) : ""}
        </div>
      </section>
    `;
  }

  _renderInfo() {
    const opts = this._options();

    return `
      <section class="section">
        <div class="section-title">
          <ha-icon icon="mdi:information-outline"></ha-icon>
          Informazioni DAZE
        </div>
        <div class="metrics">
          ${this._hasValue("tariff") ? this._metric("mdi:cash", this._tr("Tariffa energetica"), this._tariff()) : ""}
          ${this._hasValue("firmware_version") ? this._metric("mdi:chip", this._tr("Firmware"), this._state("firmware_version")) : ""}
          ${this._hasValue("software_version") ? this._metric("mdi:application-cog-outline", this._tr("Software"), this._state("software_version")) : ""}
          ${this._metric("mdi:shield-check-outline", this._tr("Integrazione"), "ha-daze")}
        </div>
      </section>

      <section class="section compact support-card">
        <div class="section-title">
          <ha-icon icon="mdi:coffee-outline"></ha-icon>
          ${this._tr("Supporta DAZE Dashboard")}
        </div>
        <div class="project-note">${this._tr("Se DAZE Dashboard ti piace e vuoi supportarne lo sviluppo, puoi offrirmi un caffè su Ko-fi.")}</div>
        <a class="support-link" href="https://ko-fi.com/fabvittori" target="_blank" rel="noopener noreferrer">
          <ha-icon icon="mdi:coffee"></ha-icon>
          ${this._tr("Offrimi un caffè")}
        </a>
      </section>

      <section class="section compact">
        <div class="section-title">
          <ha-icon icon="mdi:tune-variant"></ha-icon>
          ${this._tr("Preferenze pannello")}
        </div>
        <div class="project-line"><span>${this._tr("Grafico live")}</span><strong>${opts.show_chart ? this._tr("Attivo") : this._tr("Disattivato")}</strong></div>
        <div class="project-line"><span>${this._tr("Statistiche sessione")}</span><strong>${opts.show_session_stats ? this._tr("Attive") : this._tr("Disattivate")}</strong></div>
        <div class="project-line"><span>${this._tr("Diagnostica")}</span><strong>${opts.show_diagnostics ? this._tr("Attiva") : this._tr("Disattivata")}</strong></div>
        <div class="project-line"><span>${this._tr("Tema")}</span><strong>${opts.theme}</strong></div>
        <div class="project-note">${this._tr("Modifica queste preferenze da Impostazioni → Dispositivi e servizi → DAZE Dashboard → Configura. Nessun YAML richiesto.")}</div>
      </section>
    `;
  }

  _render() {
    if (!this.shadowRoot) return;

    if (!this._data) {
      this.shadowRoot.innerHTML = `<style>:host{display:block;min-height:100%;background:var(--primary-background-color);color:var(--primary-text-color)}.loading{padding:40px;font:600 16px system-ui;opacity:.7}</style><div class="loading">Connessione a DAZE Dashboard…</div>`;
      return;
    }

    const opts = this._options();
    const charging = this._isCharging();
    const status = this._humanStatus(this._state("status"));
    const evse = this._humanStatus(this._state("evse_state"));
    const tone = this._statusTone();
    const accent = this._statusAccent();
    const error = this._errorInfo();
    const heroLabel = charging ? "IN CARICA" : evse.toUpperCase();
    const powerPercent = this._powerPercent();

    if (!opts.show_diagnostics && this._activeView === "diagnostics") {
      this._activeView = "overview";
    }

    const forcedThemeClass = opts.theme === "dark" ? "force-dark" : opts.theme === "light" ? "force-light" : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --daze-accent: ${accent};
          display:block; min-height:100%;
          background:var(--primary-background-color); color:var(--primary-text-color);
          font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif);
        }
        *{box-sizing:border-box} button{font:inherit}
        .force-dark{--panel-bg:#0e0f10;--panel-card:#1a1b1d;--panel-soft:#27282a;--panel-text:#f1f1f1;--panel-muted:#999}
        .force-light{--panel-bg:#f5f6f7;--panel-card:#fff;--panel-soft:#eef0f2;--panel-text:#18191a;--panel-muted:#6b7280}
        .force-dark,.force-light{background:var(--panel-bg)!important;color:var(--panel-text)!important}
        .force-dark .hero,.force-dark .section,.force-dark .feature-card,.force-dark .session-card,
        .force-light .hero,.force-light .section,.force-light .feature-card,.force-light .session-card{background-color:var(--panel-card)!important}
        .force-dark .metric,.force-dark .diag-row,.force-dark .status-pill,.force-dark .power-track,
        .force-light .metric,.force-light .diag-row,.force-light .status-pill,.force-light .power-track{background:var(--panel-soft)!important}
.app{width:100%;min-height:100vh;margin:0;padding:0 0 56px}.topbar{--casa-accent:var(--daze-accent);position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--primary-background-color) 96%,transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid color-mix(in srgb,var(--divider-color) 78%,transparent);box-shadow:0 10px 28px color-mix(in srgb,#000 4%,transparent)}.topbar-main{max-width:1480px;margin:auto;min-height:72px;padding:15px 18px 9px;display:flex;align-items:center;gap:12px}.menu-btn{display:none;border:0;background:transparent;color:var(--primary-text-color);width:42px;height:42px;border-radius:13px;align-items:center;justify-content:center;cursor:pointer;flex:none;padding:0}.menu-btn ha-icon{--mdc-icon-size:27px}.menu-btn:active{background:var(--secondary-background-color)}.app-identity{display:flex;align-items:center;gap:11px;min-width:0}.app-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;flex:none;border:1px solid color-mix(in srgb,var(--casa-accent) 30%,var(--divider-color));background:color-mix(in srgb,var(--casa-accent) 9%,var(--card-background-color));color:var(--casa-accent)}.app-icon ha-icon{--mdc-icon-size:25px}.brand{min-width:0}.brand-line{display:flex;align-items:center;gap:8px;min-width:0}.brand-title{font-size:21px;line-height:1.05;font-weight:850;letter-spacing:-.025em}.version-badge{display:inline-flex;align-items:center;justify-content:center;padding:3px 7px;border-radius:999px;border:1px solid color-mix(in srgb,var(--casa-accent) 30%,var(--divider-color));background:color-mix(in srgb,var(--casa-accent) 9%,var(--card-background-color));color:var(--casa-accent);font-size:9px;font-weight:900;line-height:1;white-space:nowrap}.brand-subtitle{font-size:11px;color:var(--secondary-text-color);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nav-scroller{max-width:1480px;margin:auto;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;touch-action:pan-x;padding:0 18px}.nav-scroller::-webkit-scrollbar{display:none}.nav{display:flex;align-items:stretch;gap:22px;width:max-content;min-width:max-content;margin:0;padding:0;border:0;border-radius:0;background:transparent}.nav-button{position:relative;border:0;background:transparent;color:var(--secondary-text-color);border-radius:0;padding:10px 1px 12px;min-height:44px;display:flex;align-items:center;gap:7px;cursor:pointer;white-space:nowrap;font-size:12px;font-weight:720;letter-spacing:-.005em;transition:color .16s ease,opacity .16s ease,transform .12s ease;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}.nav-button::after{content:"";position:absolute;left:50%;right:50%;bottom:0;height:3px;border-radius:3px 3px 0 0;background:var(--casa-accent);opacity:0;transition:left .18s ease,right .18s ease,opacity .18s ease}.nav-button ha-icon{--mdc-icon-size:19px;opacity:.78;transition:opacity .16s ease,color .16s ease,transform .16s ease}.nav-button:hover{color:var(--primary-text-color)}.nav-button:hover ha-icon{opacity:1}.nav-button:active{transform:translateY(1px)}.nav-button.active{color:var(--casa-accent);font-weight:850}.nav-button.active ha-icon{opacity:1;color:var(--casa-accent);transform:translateY(-1px)}.nav-button.active::after{left:0;right:0;opacity:1}.page{width:min(1480px,100%);margin:auto;padding:22px 22px 0}
.hero{position:relative;border-radius:32px;padding:36px;border:1px solid var(--divider-color);background:radial-gradient(circle at 82% 8%,color-mix(in srgb,var(--daze-accent) 24%,transparent),transparent 38%),radial-gradient(circle at 10% 110%,rgba(99,102,241,.12),transparent 42%),var(--card-background-color);overflow:hidden}
        .hero-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:32px}
        .kicker{font-size:11px;font-weight:850;letter-spacing:.18em;opacity:.52;margin-bottom:10px}
        h1{margin:0;font-size:clamp(46px,7vw,76px);letter-spacing:-.065em;line-height:.9}
        .status-pill{display:inline-flex;align-items:center;gap:9px;margin-top:18px;padding:9px 14px;border-radius:999px;background:var(--secondary-background-color);font-size:13px;font-weight:850;letter-spacing:.05em;color:var(--daze-accent)}
        .dot{width:10px;height:10px;border-radius:50%;background:currentColor}.charging .dot{animation:pulse 1.6s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:.45;transform:scale(.85)}50%{opacity:1;transform:scale(1.25)}}
        .hero-status{margin-top:12px;opacity:.68;font-weight:650}.power-block{text-align:right;min-width:360px}
        .power-row{display:flex;justify-content:flex-end;align-items:baseline;gap:10px}.power{font-size:clamp(60px,10vw,100px);line-height:.82;font-weight:950;letter-spacing:-.075em}.power-unit{font-size:clamp(24px,3vw,38px);font-weight:850;opacity:.72}
        .power-sub{margin-top:12px;opacity:.58;font-weight:700}.power-track{width:100%;height:8px;margin-top:18px;border-radius:999px;overflow:hidden;background:var(--secondary-background-color)}
        .power-fill{height:100%;width:${powerPercent}%;min-width:${charging ? "4%" : "0"};border-radius:inherit;background:linear-gradient(90deg,var(--daze-accent),#22c55e);transition:width .45s ease}
        .session-strip{display:flex;justify-content:flex-end;gap:20px;margin-top:16px}.session-item{text-align:right}.session-label,.feature-label,.metric-label,.diag-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;opacity:.5;font-weight:850}.session-value{margin-top:3px;font-size:16px;font-weight:850}


        .session-grid{display:grid;grid-template-columns:1.45fr repeat(3,1fr);gap:14px;margin-top:18px}.session-card,.feature-card{min-width:0;border-radius:22px;padding:20px;border:1px solid var(--divider-color);background:var(--card-background-color)}.primary-stat{background:radial-gradient(circle at 90% 10%,color-mix(in srgb,var(--daze-accent) 14%,transparent),transparent 45%),var(--card-background-color)}
        .feature-value{font-size:clamp(28px,4vw,44px);font-weight:900;letter-spacing:-.04em;margin-top:8px;line-height:1}.feature-value.medium{font-size:30px}.feature-value.small{font-size:26px}.feature-caption{margin-top:8px;font-size:12px;opacity:.54;font-weight:650}.value-number{font:inherit;font-weight:inherit;letter-spacing:inherit}.value-unit{font-size:.48em;font-weight:850;letter-spacing:-.01em;margin-left:.18em;opacity:.72;vertical-align:baseline}
        .overview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
        .section{margin-top:18px;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:24px;padding:20px}.section.compact{max-width:720px}.section-title{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:850;margin-bottom:16px}
        .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metric{min-width:0;padding:14px;border-radius:18px;background:var(--secondary-background-color);display:flex;gap:12px;align-items:center}
        .metric-icon,.diag-icon{width:42px;height:42px;flex:0 0 42px;border-radius:14px;display:grid;place-items:center;color:var(--daze-accent);background:color-mix(in srgb,var(--daze-accent) 12%,transparent)}
        .metric-content{min-width:0}.metric-value,.diag-value{margin-top:4px;font-size:20px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.metric-value .value-unit{font-size:.52em}.metric-detail-line{margin-top:4px;font-size:10px;line-height:1.25;color:var(--secondary-text-color);white-space:normal}
        .metric.ok .metric-icon{color:#43a047}.metric.bad .metric-icon{color:#ef5350}.metric.neutral .metric-icon{color:#8b8b8b}
        .chart-section{overflow:hidden}.chart-svg{display:block;width:100%;height:230px}.chart-axis{stroke:var(--divider-color);stroke-width:2}.chart-line{fill:none;stroke:var(--daze-accent);stroke-width:4;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}.chart-dot{fill:var(--daze-accent)}.chart-legend{display:flex;justify-content:space-between;gap:12px;margin-top:7px;font-size:12px;opacity:.62}.chart-empty{height:180px;display:grid;place-items:center;opacity:.55}
        .diag-list{display:grid;gap:10px}.diag-row{display:flex;align-items:center;gap:14px;padding:14px;border-radius:18px;background:var(--secondary-background-color)}.diag-main{min-width:0;flex:1}.diag-status{padding:6px 10px;border-radius:999px;font-size:11px;font-weight:850;background:var(--card-background-color)}.diag-status.ok{color:#22c55e}.diag-status.warn{color:#f59e0b}.diag-status.bad{color:#ef4444}.diag-status.neutral{color:var(--secondary-text-color)}
        .diag-track{height:5px;margin-top:9px;border-radius:999px;background:var(--card-background-color);overflow:hidden}.diag-fill{height:100%;border-radius:999px;background:#64748b}.diag-fill.ok{background:#22c55e}.diag-fill.warn{background:#f59e0b}.diag-fill.bad{background:#ef4444}
        .project-line{display:flex;justify-content:space-between;gap:18px;padding:11px 0;border-bottom:1px solid var(--divider-color)}.project-note{margin-top:14px;font-size:12px;opacity:.58;line-height:1.5}
        .notice{margin-top:18px;border-radius:18px;padding:16px 18px;background:var(--secondary-background-color);opacity:.8}.footer a{color:inherit;text-decoration:none;font-weight:800}.footer a:hover{text-decoration:underline}.footer{display:flex;justify-content:center;gap:8px;font-size:12px;opacity:.5;margin:18px 0 6px}

        .support-card{overflow:hidden}
        .support-link{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:10px 13px;border-radius:12px;text-decoration:none;color:var(--primary-text-color);font-size:12px;font-weight:850;background:rgba(127,127,127,.09);border:1px solid rgba(127,127,127,.14)}
        .support-link ha-icon{--mdc-icon-size:18px}
        .language-selector{display:flex;align-items:center;gap:4px;margin:0 0 12px auto;padding:3px;border:1px solid rgba(127,127,127,.13);border-radius:12px;background:rgba(127,127,127,.055);width:max-content}
        .language-selector button{border:0;background:transparent;color:var(--primary-text-color);font:inherit;font-size:10px;font-weight:800;padding:6px 8px;border-radius:9px;cursor:pointer;opacity:.52}
        .language-selector button.active{background:rgba(127,127,127,.13);opacity:1}
        /* v2.1 dynamic visual refresh */
        .hero{position:relative;overflow:hidden;isolation:isolate}
        .hero-ambient{position:absolute;inset:-35% -10% auto auto;width:420px;height:420px;border-radius:50%;filter:blur(38px);opacity:.16;z-index:-1;background:radial-gradient(circle at 50% 50%,var(--primary-color),transparent 68%);pointer-events:none}
        .hero.is-charging .hero-ambient{opacity:.28;animation:ambientPulse 2.8s ease-in-out infinite}
        .eyebrow-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .status-pill{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:999px;font-size:11px;font-weight:850;letter-spacing:.01em;border:1px solid rgba(128,128,128,.18);background:rgba(127,127,127,.08)}
        .status-pill ha-icon{--mdc-icon-size:17px}
        .status-pill.charging{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.28)}
        .status-pill.connected{background:rgba(59,130,246,.12);border-color:rgba(59,130,246,.28)}
        .status-pill.offline{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.28)}
        .hero-title{margin-top:18px;font-size:clamp(30px,4vw,50px);font-weight:950;letter-spacing:-.055em;line-height:.98}
        .hero-subtitle{margin-top:10px;font-size:13px;opacity:.58;font-weight:650}
        .hero-kpi-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:22px}
        .hero-kpi{min-width:0;padding:13px 14px;border-radius:18px;border:1px solid rgba(127,127,127,.12);background:rgba(127,127,127,.055);backdrop-filter:blur(12px)}
        .hero-kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;opacity:.46;font-weight:850}
        .hero-kpi-value{margin-top:6px;font-size:24px;font-weight:950;letter-spacing:-.035em;white-space:nowrap}
        .hero-kpi-value.compact{font-size:19px}
        .power-block{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:280px}
        .power-ring{--progress:0;position:relative;width:min(250px,65vw);aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--primary-color) calc(var(--progress) * 1%),rgba(127,127,127,.12) 0);box-shadow:0 24px 70px rgba(0,0,0,.13),inset 0 0 0 1px rgba(255,255,255,.05)}
        .power-ring::after{content:"";position:absolute;inset:10px;border-radius:50%;background:var(--card-background-color);box-shadow:inset 0 0 0 1px rgba(127,127,127,.1)}
        .hero.is-charging .power-ring{box-shadow:0 0 0 1px rgba(245,158,11,.12),0 24px 80px rgba(245,158,11,.15);animation:ringPulse 2.6s ease-in-out infinite}
        .power-ring-inner{position:relative;z-index:1;text-align:center;padding:25px}
        .power-label{font-size:11px;text-transform:uppercase;letter-spacing:.09em;opacity:.48;font-weight:850}
        .power-number{margin-top:5px;font-size:clamp(38px,5vw,58px);font-weight:950;letter-spacing:-.06em;line-height:.95}
        .power-caption{margin-top:8px;font-size:11px;opacity:.52;font-weight:750}
        .power-track{width:min(250px,65vw);height:5px;border-radius:999px;overflow:hidden;background:rgba(127,127,127,.12);margin-top:17px}
        .power-track-fill{height:100%;border-radius:inherit;background:var(--primary-color);transition:width .45s ease}
        .power-track-labels{width:min(250px,65vw);display:flex;justify-content:space-between;margin-top:7px;font-size:9px;opacity:.42;font-weight:750}
        .feature-card,.metric,.diag-row,.chart-card,.section{transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease}
        @media(hover:hover){.feature-card:hover,.metric:hover,.diag-row:hover{transform:translateY(-2px)}}
        .diag-fill,.power-track-fill{transition:width .5s cubic-bezier(.2,.8,.2,1)}
        @keyframes ambientPulse{0%,100%{transform:scale(.96);opacity:.18}50%{transform:scale(1.06);opacity:.34}}
        @keyframes ringPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.012)}}
        @media(prefers-reduced-motion:reduce){.hero.is-charging .hero-ambient,.hero.is-charging .power-ring{animation:none!important}.feature-card,.metric,.diag-row,.chart-card,.section,.diag-fill,.power-track-fill{transition:none!important}}
@media(max-width:1020px){
          .session-grid{grid-template-columns:repeat(2,1fr)}
          .metrics{grid-template-columns:repeat(2,1fr)}
        }
        @media(max-width:760px){
          .hero-grid{grid-template-columns:1fr}.hero-kpi-row{grid-template-columns:repeat(3,minmax(0,1fr))}.power-block{margin-top:4px}
          .power-block{text-align:left;min-width:0}
          .power-row{justify-content:flex-start}
          .session-strip{justify-content:flex-start}
          .session-item{text-align:left}
        }
        @media(max-width:620px){
          .app{padding:0 0 42px}
          .menu-btn{display:flex}
          .topbar-main{min-height:62px;padding:9px 10px 7px;gap:7px}
          .app-identity{gap:8px}
          .app-icon{width:39px;height:39px;border-radius:12px}
          .app-icon ha-icon{--mdc-icon-size:22px}
          .brand-title{font-size:19px}
          .brand-subtitle{font-size:10px;margin-top:3px}
          .version-badge{font-size:8px;padding:3px 6px}
          .nav-scroller{padding:0 10px}
          .nav{gap:18px;width:max-content;min-width:max-content}
          .nav-button{padding:9px 1px 11px;font-size:12px;min-height:42px;flex:none;justify-content:flex-start}
          .nav-button ha-icon{--mdc-icon-size:18px}
          .page{padding:12px 10px 0}
          .hero{padding:22px;border-radius:24px}
          .section{padding:15px}
          .session-grid,.overview-grid,.metrics{grid-template-columns:1fr}.hero-kpi-row{grid-template-columns:1fr 1fr}.hero-kpi:last-child{grid-column:1/-1}.power-ring{width:min(220px,72vw)}.power-track,.power-track-labels{width:min(220px,72vw)}
          .chart-svg{height:180px}
          .footer{padding:0 10px}
        }
      </style>

      <div class="app ${forcedThemeClass}">
        <header class="topbar">
          <div class="topbar-main">
            <button class="menu-btn" data-menu-toggle type="button" aria-label="Apri menu Home Assistant" title="Menu Home Assistant">
              <ha-icon icon="mdi:menu"></ha-icon>
            </button>
            <div class="app-identity">
              <div class="app-icon"><ha-icon icon="mdi:ev-station"></ha-icon></div>
              <div class="brand">
                <div class="brand-line">
                  <div class="brand-title">DAZE Dashboard</div>
                  <span class="version-badge">${this._dashboardVersion()}</span>
                </div>
                <div class="brand-subtitle">Wallbox · Charge Center</div>
              </div>
            </div>
          </div>
          <div class="nav-scroller">
            ${this._languageSelector()}
        <nav class="nav">
              ${this._navButton("overview", "mdi:view-dashboard-outline", this._tr("Panoramica"))}
              ${opts.show_diagnostics ? this._navButton("diagnostics", "mdi:stethoscope", this._tr("Diagnostica")) : ""}
              ${this._navButton("info", "mdi:information-outline", this._tr("Informazioni"))}
            </nav>
          </div>
        </header>

        <main class="page">
<section class="hero ${this._chargingPulseClass()}">
        <div class="hero-ambient"></div>
        <div class="hero-grid">
          <div class="hero-copy">
            <div class="eyebrow-row">
              <span class="status-pill ${this._statusTone()}">
                <ha-icon icon="${this._statusIcon()}"></ha-icon>
                ${this._statusLabel()}
              </span>
            </div>
            <div class="hero-title">${this._tr("Energia in tempo reale")}</div>
            <div class="hero-subtitle">${this._tr("Wallbox DAZE · aggiornamento live da Home Assistant")}</div>
            <div class="hero-kpi-row">
              <div class="hero-kpi">
                <div class="hero-kpi-label">${this._tr("Energia sessione")}</div>
                <div class="hero-kpi-value">${this._sessionEnergyHtml()}</div>
              </div>
              <div class="hero-kpi">
                <div class="hero-kpi-label">${this._tr("Durata")}</div>
                <div class="hero-kpi-value compact">${this._elapsed()}</div>
              </div>
              <div class="hero-kpi">
                <div class="hero-kpi-label">${this._tr("Costo stimato")}</div>
                <div class="hero-kpi-value compact">${this._estimatedCost()}</div>
              </div>
            </div>
          </div>
          <div class="power-block">
            <div class="power-ring" style="--progress:${this._heroProgress()}">
              <div class="power-ring-inner">
                <div class="power-label">${this._tr("Potenza")}</div>
                <div class="power-number">${this._chargingPowerHtml()}</div>
                <div class="power-caption">${this._number("charging_current_l1", 1, " A")} · ${this._number("voltage_l1", 0, " V")}</div>
              </div>
            </div>
            <div class="power-track"><div class="power-track-fill" style="width:${this._heroProgress()}%"></div></div>
            <div class="power-track-labels"><span>0%</span><span>${Math.round(this._heroProgress())}% ${this._tr("del limite")}</span><span>100%</span></div>
          </div>
        </div>
      </section>
${this._data.available ? (
          this._activeView === "diagnostics"
            ? this._renderDiagnostics()
            : this._activeView === "info"
              ? this._renderInfo()
              : this._renderOverview(evse,error,charging)
        ) : `<div class="notice">Nessuna entità compatibile con ha-daze è stata rilevata. Installa e configura prima l'integrazione ha-daze.</div>`}

        <div class="footer">
          <span>DAZE Dashboard v${this._dashboardVersion()}</span>
          <span>·</span>
          <span>by Fabio Vittori</span>
          <span>·</span>
          <a href="https://ko-fi.com/fabvittori" target="_blank" rel="noopener noreferrer">
            ${this._tr("Offrimi un caffè")}
          </a>
          <span>·</span>
          <span>Powered by <strong>ha-daze</strong></span>
        </div>
        </main>
      </div>
    `;

    this._bindEvents();
  }
}

if (!customElements.get("daze-dashboard-panel")) {
  customElements.define("daze-dashboard-panel", DazeDashboardPanel);
}

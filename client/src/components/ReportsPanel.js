import { reportApi } from "../api/reportApi.js";
import { toast } from "../utils/toast.js";

// ---------------------------------------------------------
// Helpers visuais (somente apresentação)
// ---------------------------------------------------------
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const svg = (inner, size = 14, sw = 2) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const ICON = {
  cycle:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  quality:
    '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
};

const STATUS_TONE = {
  completed: "success",
  aprovado: "success",
  reprovado: "danger",
  failed: "danger",
  stopped: "neutral",
};
const STATUS_LABEL = {
  completed: "Concluído",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  failed: "Falhou",
  stopped: "Interrompido",
};

export class ReportsPanel {
  constructor() {
    this._reports = [];
    this._selectedId = null;

    this._grid = document.getElementById("reports-grid-container");
    this._detail = document.getElementById("reports-detail-container");
    this._emptyState = document.getElementById("reports-empty-state");
    this._countBadge = document.getElementById("reports-count");
    this._filterType = document.getElementById("reports-filter-type");
    this._filterStatus = document.getElementById("reports-filter-status");

    this._filterType?.addEventListener("change", () => this._renderGrid());
    this._filterStatus?.addEventListener("change", () => this._renderGrid());

    document.addEventListener("navigate-reports", () => this.load());
  }

  async load() {
    try {
      const data = await reportApi.list();
      if (data.success) {
        this._reports = data.list;
        this._renderGrid();
      }
    } catch {
      toast.error("Não foi possível carregar os relatórios.");
    }
  }

  _filtered() {
    let list = [...this._reports];
    const type = this._filterType?.value;
    const status = this._filterStatus?.value;
    if (type) list = list.filter((r) => r.type === type);
    if (status) list = list.filter((r) => r.status === status);
    return list;
  }

  _renderGrid() {
    if (!this._grid) return;
    const list = this._filtered();

    if (this._countBadge) this._countBadge.textContent = this._reports.length;

    if (list.length === 0) {
      this._grid.innerHTML = "";
      this._emptyState?.classList.remove("hidden");
      this._detail?.classList.add("hidden");
      this._selectedId = null;
      return;
    }

    this._emptyState?.classList.add("hidden");

    this._grid.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        ${list.map((r) => this._cardHtml(r)).join("")}
      </div>`;

    this._grid.querySelectorAll(".report-card").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-delete]")) return;
        this._selectReport(el.dataset.id);
      });
    });

    this._grid.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Remover este relatório?"))
          this._deleteReport(btn.dataset.delete);
      });
    });
  }

  _cardHtml(r) {
    const isSelected = r.id === this._selectedId;
    const date = new Date(r.createdAt).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const isCyclic = r.type === "cyclic";
    const p = r.payload || {};

    // Métricas do card
    const metricA = isCyclic
      ? {
          label: "Ciclos",
          value: `${p.completedCycles?.toFixed(0) ?? 0}/${p.totalCycles ?? "?"}`,
        }
      : {
          label: "Etapas",
          value: `${p.successCount ?? 0}/${p.totalSteps ?? 0}`,
        };

    const metricB = isCyclic
      ? { label: "Falhas", value: p.totalFailures ?? 0 }
      : { label: "Reprovadas", value: p.failCount ?? 0 };

    const duration =
      r.startedAt && r.completedAt
        ? this._formatDuration(new Date(r.completedAt) - new Date(r.startedAt))
        : "—";

    const accentColor = "text-primary";
    const borderAccent = isSelected
      ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.25)]"
      : "border-border hover:border-primary/40";

    return `
      <div
        data-id="${esc(r.id)}"
        class="report-card relative bg-card rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden group
          ${borderAccent} ${isSelected ? "bg-muted" : "hover:bg-card"}"
      >
        <!-- Faixa de tipo no topo -->
        <div class="h-1 w-full bg-primary"></div>

        <div class="p-4">
          <!-- Cabeçalho do card -->
          <div class="flex items-start justify-between gap-2 mb-3">
            <div class="flex items-center gap-2 min-w-0">
              <div class="shrink-0 ${accentColor}">
                ${svg(isCyclic ? ICON.cycle : ICON.quality, 16)}
              </div>
              <span class="text-xs font-semibold uppercase tracking-wider ${accentColor}">
                ${isCyclic ? "Ciclagem" : "Qualidade"}
              </span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              ${this._statusBadge(r.status)}
              <button
                data-delete="${esc(r.id)}"
                class="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded cursor-pointer transition-all"
                title="Remover"
              >
                ${svg(ICON.trash, 13)}
              </button>
            </div>
          </div>

          <!-- Nome da fechadura -->
          <p class="font-bold text-sm leading-snug truncate mb-1" title="${esc(r.lockAlias)}">${esc(r.lockAlias)}</p>
          <p class="text-muted-foreground text-xs truncate mb-4" title="${esc(r.title)}">${esc(r.title)}</p>

          <!-- Métricas -->
          <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="bg-background rounded-lg px-2 py-2 text-center">
              <p class="text-sm font-bold tabular-nums">${metricA.value}</p>
              <p class="text-muted-foreground text-xs mt-0.5">${metricA.label}</p>
            </div>
            <div class="bg-background rounded-lg px-2 py-2 text-center">
              <p class="text-sm font-bold tabular-nums ${p.totalFailures > 0 || p.failCount > 0 ? "text-destructive" : ""}">${metricB.value}</p>
              <p class="text-muted-foreground text-xs mt-0.5">${metricB.label}</p>
            </div>
            <div class="bg-background rounded-lg px-2 py-2 text-center">
              <p class="text-sm font-bold tabular-nums">${duration}</p>
              <p class="text-muted-foreground text-xs mt-0.5">Duração</p>
            </div>
          </div>

          <!-- Rodapé do card -->
          <div class="flex items-center justify-between gap-2">
            <p class="text-muted-foreground text-xs truncate">${date}</p>
            ${r.testerName ? `<p class="text-muted-foreground text-xs truncate shrink-0">${esc(r.testerName)}</p>` : ""}
          </div>
        </div>

        <!-- Indicador de selecionado -->
        ${
          isSelected
            ? `
          <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
          <div class="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]"></div>
        `
            : ""
        }
      </div>`;
  }

  _selectReport(id) {
    if (this._selectedId === id) {
      this._selectedId = null;
      this._detail?.classList.add("hidden");
      this._renderGrid();
      return;
    }
    this._selectedId = id;
    const report = this._reports.find((r) => r.id === id);
    if (report) this._renderDetail(report);
    this._renderGrid();

    // Scroll suave para o detalhe
    setTimeout(() => {
      this._detail?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  _renderDetail(report) {
    if (!this._detail) return;
    this._detail.classList.remove("hidden");

    const createdAt = new Date(report.createdAt).toLocaleString("pt-BR");
    const startedAt = new Date(report.startedAt).toLocaleString("pt-BR");
    const completedAt = report.completedAt
      ? new Date(report.completedAt).toLocaleString("pt-BR")
      : "—";
    const duration =
      report.startedAt && report.completedAt
        ? this._formatDuration(
            new Date(report.completedAt) - new Date(report.startedAt),
          )
        : "—";

    const p = report.payload;
    const bodyHtml =
      report.type === "cyclic"
        ? this._cyclicDetailBody(p)
        : this._qualityDetailBody(p);

    const isCyclic = report.type === "cyclic";
    const info = (label, value) => `
      <div class="ui-tile min-h-0 py-3">
        <p class="text-muted-foreground text-xs">${label}</p>
        <p class="max-w-full truncate text-sm font-semibold" title="${esc(value)}">${esc(value)}</p>
      </div>`;

    this._detail.innerHTML = `
      <section class="ui-panel">
        <div class="ui-panel-head">
          <div class="min-w-0">
            <div class="mb-1.5 flex flex-wrap items-center gap-2">
              <span class="ui-chip ui-chip-tone ui-tone-primary">${svg(isCyclic ? ICON.cycle : ICON.quality, 12)}${isCyclic ? "Ciclagem" : "Qualidade"}</span>
              ${this._statusBadge(report.status)}
            </div>
            <h3 class="ui-panel-title truncate">${esc(report.title)}</h3>
            <p class="ui-panel-subtitle">
              Gerado em ${createdAt}${report.testerName ? ` · Testador: <strong class="text-foreground">${esc(report.testerName)}</strong>` : ""}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button type="button" id="btn-close-detail" class="ui-btn ui-btn-soft ui-btn-sm">${svg(ICON.close, 13, 2.5)}Fechar</button>
            <button type="button" id="btn-export-pdf" class="ui-btn ui-btn-primary ui-btn-sm">${svg(ICON.download, 13, 2.5)}Exportar PDF</button>
          </div>
        </div>

        <div class="ui-section">
          <div class="mb-3 flex items-center gap-2">${svg(ICON.list, 15)}<h4 class="ui-section-title">Resumo do teste</h4></div>
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            ${info("Fechadura", report.lockAlias)}
            ${info("Início", startedAt)}
            ${info("Conclusão", completedAt)}
            ${info("Duração", duration)}
          </div>
        </div>

        ${bodyHtml}
      </section>`;

    document
      .getElementById("btn-export-pdf")
      ?.addEventListener("click", () => this._exportPDF(report));
    document
      .getElementById("btn-close-detail")
      ?.addEventListener("click", () => {
        this._selectedId = null;
        this._detail.classList.add("hidden");
        this._renderGrid();
      });
  }

  _metric(value, label, tone = "", small = false) {
    return `
      <div class="ui-tile min-h-0 ${tone ? `ui-tone-${tone}` : ""}">
        <p class="${small ? "text-xl" : "text-3xl"} leading-tight font-bold tracking-tight tabular-nums ${tone ? "ui-text-tone" : ""}">${value}</p>
        <p class="text-muted-foreground text-xs">${label}</p>
      </div>`;
  }

  _cyclicDetailBody(p) {
    const successRate =
      p.totalCycles > 0
        ? ((p.completedCycles / p.totalCycles) * 100).toFixed(1)
        : 0;
    const batteryDrop =
      p.batteryStart != null && p.batteryEnd != null
        ? `${p.batteryStart}% → ${p.batteryEnd}% (−${p.batteryStart - p.batteryEnd}%)`
        : "—";
    const logs = (p.logs || []).slice(-50);
    const failures = p.totalFailures ?? 0;

    return `
      <div class="ui-section">
        <div class="mb-3 flex items-center gap-2">${svg(ICON.chart, 15)}<h4 class="ui-section-title">Resultados</h4></div>
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          ${this._metric(p.completedCycles?.toFixed(0) ?? 0, `de ${p.totalCycles} ciclos`)}
          ${this._metric(failures, "Falhas", failures > 0 ? "danger" : "")}
          ${this._metric(`${successRate}%`, "Taxa de sucesso")}
          ${this._metric(batteryDrop, "Variação de bateria", "", true)}
        </div>
      </div>
      <div class="ui-section">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">${svg(ICON.list, 15)}<h4 class="ui-section-title">Log de eventos</h4></div>
          ${logs.length < (p.logs?.length ?? 0) ? `<span class="ui-hint">Últimos ${logs.length} de ${p.logs.length} eventos</span>` : ""}
        </div>
        ${
          logs.length === 0
            ? `<div class="border-border text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">Nenhum log registrado.</div>`
            : `<div class="border-border overflow-hidden rounded-xl border"><div class="ui-scroll"><table class="ui-table">
                <thead><tr><th class="w-44">Hora</th><th class="w-28">Tipo</th><th>Mensagem</th></tr></thead>
                <tbody>${logs
                  .map(
                    (l) => `
                  <tr>
                    <td class="ui-mono text-muted-foreground text-xs whitespace-nowrap">${new Date(l.timestamp).toLocaleString("pt-BR")}</td>
                    <td>${this._logTypeBadge(l.type)}</td>
                    <td class="text-xs ${this._logLevelClass(l.level)}">${esc(l.message)}</td>
                  </tr>`,
                  )
                  .join("")}</tbody>
              </table></div></div>`
        }
      </div>`;
  }

  _qualityDetailBody(p) {
    const failCount = p.failCount ?? 0;
    const steps = p.steps || [];

    return `
      <div class="ui-section">
        <div class="mb-3 flex items-center gap-2">${svg(ICON.chart, 15)}<h4 class="ui-section-title">Resultados</h4></div>
        <div class="grid grid-cols-3 gap-4">
          ${this._metric(p.totalSteps, "Etapas totais")}
          ${this._metric(p.successCount, "Aprovadas", "success")}
          ${this._metric(failCount, "Reprovadas", failCount > 0 ? "danger" : "")}
        </div>
      </div>
      <div class="ui-section">
        <div class="mb-4 flex items-center gap-2">${svg(ICON.list, 15)}<h4 class="ui-section-title">Etapas do roteiro</h4></div>
        <ol class="ui-timeline">
          ${steps
            .map((st) => {
              const ok = st.status === "sucesso";
              return `
            <li class="ui-step ${ok ? "ui-tone-success is-done" : "ui-tone-danger is-failed"}">
              <span class="ui-step-marker">${svg(ok ? ICON.check : ICON.x, 16, 3)}</span>
              <div class="ui-step-card">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-sm font-semibold">${esc(st.name)}</span>
                  <span class="ui-badge ui-badge-dot">${ok ? "Concluída" : "Falhou"}</span>
                </div>
                ${st.errorMsg ? `<div class="ui-chip-tone ui-tone-danger mt-2 rounded-lg px-2.5 py-1.5 text-xs">${esc(st.errorMsg)}</div>` : ""}
                ${st.logs && st.logs.length > 0 ? `<div class="ui-log ui-mono">${st.logs.map((log) => `<div class="ui-log-line">${esc(log)}</div>`).join("")}</div>` : ""}
              </div>
            </li>`;
            })
            .join("")}
        </ol>
      </div>`;
  }

  async _deleteReport(id) {
    try {
      await reportApi.remove(id);
      this._reports = this._reports.filter((r) => r.id !== id);
      if (this._selectedId === id) {
        this._selectedId = null;
        this._detail?.classList.add("hidden");
      }
      this._renderGrid();
      toast.success("Relatório removido.");
    } catch {
      toast.error("Erro ao remover relatório.");
    }
  }

  async _exportPDF(report) {
    if (!window.jspdf) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      document.head.appendChild(script);
      await new Promise((res) => {
        script.onload = res;
      });
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const p = report.payload;
    const margin = 14;
    let y = 20;

    const line = (text, size = 10, style = "normal", color = [30, 30, 30]) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", style);
      doc.setTextColor(...color);
      doc.text(text, margin, y);
      y += size * 0.45 + 3;
    };
    const hLine = () => {
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, 210 - margin, y);
      y += 4;
    };
    const kv = (key, val) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(key + ":", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(String(val ?? "—"), margin + 38, y);
      y += 6;
    };

    doc.setFillColor(214, 31, 103);
    doc.rect(0, 0, 210, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("PADO TESTLOCK — RELATÓRIO DE TESTE", margin, 8);
    doc.text(new Date().toLocaleString("pt-BR"), 210 - margin, 8, {
      align: "right",
    });

    y = 22;
    line(report.title, 14, "bold");
    y += 1;
    line(
      `Tipo: ${report.type === "cyclic" ? "Ciclagem" : "Qualidade"}   ·   Status: ${report.status.toUpperCase()}`,
      9,
      "normal",
      [80, 80, 80],
    );
    y += 2;
    hLine();

    line("Informações Gerais", 11, "bold");
    y += 1;
    kv("Fechadura", report.lockAlias);
    kv("ID da Fechadura", report.lockId);
    kv("Testador", report.testerName || "—");
    kv("Início", new Date(report.startedAt).toLocaleString("pt-BR"));
    kv(
      "Conclusão",
      report.completedAt
        ? new Date(report.completedAt).toLocaleString("pt-BR")
        : "—",
    );
    if (report.startedAt && report.completedAt) {
      kv(
        "Duração",
        this._formatDuration(
          new Date(report.completedAt) - new Date(report.startedAt),
        ),
      );
    }
    y += 2;
    hLine();

    if (report.type === "cyclic") {
      line("Resultado da Ciclagem", 11, "bold");
      y += 1;
      kv(
        "Ciclos realizados",
        `${p.completedCycles?.toFixed(0) ?? 0} / ${p.totalCycles}`,
      );
      kv(
        "Taxa de sucesso",
        `${p.totalCycles > 0 ? ((p.completedCycles / p.totalCycles) * 100).toFixed(1) : 0}%`,
      );
      kv("Total de falhas", p.totalFailures ?? 0);
      kv("Intervalo entre ciclos", `${p.delayBetweenCycles}s`);
      kv("Falhas máx. consecutivas", p.maxConsecutiveFailures);
      kv(
        "Bateria inicial",
        p.batteryStart != null ? `${p.batteryStart}%` : "—",
      );
      kv("Bateria final", p.batteryEnd != null ? `${p.batteryEnd}%` : "—");
      if (p.lockMac) kv("MAC Address", p.lockMac);
      y += 2;
      hLine();

      const logs = p.logs || [];
      if (logs.length > 0) {
        line(`Log de Eventos (últimos ${logs.length})`, 11, "bold");
        y += 1;
        logs.forEach((l) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(
            `${new Date(l.timestamp).toLocaleTimeString("pt-BR")}  [${l.type}]  ${l.message}`,
            margin,
            y,
          );
          y += 4.5;
        });
      }
    } else {
      line("Resultado da Auditoria de Qualidade", 11, "bold");
      y += 1;
      kv("Etapas totais", p.totalSteps);
      kv("Aprovadas", p.successCount);
      kv("Reprovadas", p.failCount);
      y += 2;
      hLine();

      line("Detalhes por Etapa", 11, "bold");
      y += 2;
      (p.steps || []).forEach((s) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }
        const color = s.status === "sucesso" ? [22, 163, 74] : [220, 38, 38];
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...color);
        doc.text(s.status === "sucesso" ? "✓" : "✗", margin, y);
        doc.setTextColor(30, 30, 30);
        doc.text(s.name, margin + 6, y);
        y += 5;
        if (s.errorMsg) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(180, 50, 50);
          doc.text(`  Erro: ${s.errorMsg}`, margin + 6, y);
          y += 4.5;
        }
        (s.logs || []).forEach((log) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(110, 110, 110);
          doc.text(`  → ${log}`, margin + 8, y);
          y += 4;
        });
        y += 1;
      });
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 160);
      doc.text(`Pado TestLock · Página ${i} de ${pageCount}`, 105, 290, {
        align: "center",
      });
    }

    doc.save(
      `relatorio_${report.title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50)}.pdf`,
    );
    toast.success("PDF exportado com sucesso!");
  }

  _statusBadge(status) {
    const tone = STATUS_TONE[status] || "neutral";
    return `<span class="ui-badge ui-badge-dot ui-tone-${tone}">${STATUS_LABEL[status] || esc(status)}</span>`;
  }

  _logTypeBadge(type) {
    const tones = {
      UNLOCK: "success",
      LOCK: "info",
      BATTERY: "warning",
      SYSTEM: "neutral",
    };
    return `<span class="ui-chip ui-chip-tone ui-tone-${tones[type] || "neutral"} ui-mono font-semibold">${esc(type)}</span>`;
  }

  _logLevelClass(level) {
    return (
      {
        success: "ui-tone-success ui-text-tone",
        error: "ui-tone-danger ui-text-tone",
        warning: "ui-tone-warning ui-text-tone",
        info: "text-muted-foreground",
      }[level] || "text-muted-foreground"
    );
  }

  _formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }
}

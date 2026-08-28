import { reportApi } from "../api/reportApi.js";
import { toast } from "../utils/toast.js";

export class ReportsPanel {
  constructor() {
    this._reports = [];
    this._selectedId = null;

    this._container  = document.getElementById("reports-list-container");
    this._detail     = document.getElementById("reports-detail-container");
    this._emptyState = document.getElementById("reports-empty-state");
    this._countBadge = document.getElementById("reports-count");
    this._filterType = document.getElementById("reports-filter-type");
    this._filterStatus = document.getElementById("reports-filter-status");

    this._filterType?.addEventListener("change", () => this._renderList());
    this._filterStatus?.addEventListener("change", () => this._renderList());

    document.addEventListener("navigate-reports", () => this.load());
  }

  async load() {
    try {
      const data = await reportApi.list();
      if (data.success) {
        this._reports = data.list;
        this._renderList();
      }
    } catch (err) {
      toast.error("Não foi possível carregar os relatórios.");
    }
  }

  _filtered() {
    let list = [...this._reports];
    const type   = this._filterType?.value;
    const status = this._filterStatus?.value;
    if (type)   list = list.filter((r) => r.type === type);
    if (status) list = list.filter((r) => r.status === status);
    return list;
  }

  _renderList() {
    if (!this._container) return;
    const list = this._filtered();

    if (this._countBadge) this._countBadge.textContent = this._reports.length;

    if (list.length === 0) {
      this._container.innerHTML = "";
      if (this._emptyState) this._emptyState.classList.remove("hidden");
      if (this._detail) this._detail.classList.add("hidden");
      return;
    }

    if (this._emptyState) this._emptyState.classList.add("hidden");

    this._container.innerHTML = list.map((r) => {
      const isSelected = r.id === this._selectedId;
      const date = new Date(r.createdAt).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });

      return `
      <div
        data-id="${r.id}"
        class="report-row flex items-center justify-between gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all
          ${isSelected ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40 hover:bg-card"}"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="shrink-0 ${r.type === "cyclic" ? "text-blue-500" : "text-purple-500"}">
            ${r.type === "cyclic" ? this._iconCyclic() : this._iconQuality()}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold truncate">${r.title}</p>
            <p class="text-muted-foreground text-xs mt-0.5">
              ${date}${r.testerName ? ` · ${r.testerName}` : ""}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${this._statusBadge(r.status, r.type)}
          <button data-delete="${r.id}" class="text-muted-foreground hover:text-destructive p-1 rounded cursor-pointer transition-colors" title="Remover">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>`;
    }).join("");

    this._container.querySelectorAll(".report-row").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-delete]")) return;
        this._selectReport(el.dataset.id);
      });
    });

    this._container.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Remover este relatório?")) this._deleteReport(btn.dataset.delete);
      });
    });
  }

  _selectReport(id) {
    if (this._selectedId === id) {
      this._selectedId = null;
      if (this._detail) this._detail.classList.add("hidden");
      this._renderList();
      return;
    }
    this._selectedId = id;
    const report = this._reports.find((r) => r.id === id);
    if (report) this._renderDetail(report);
    this._renderList();
  }

  _renderDetail(report) {
    if (!this._detail) return;
    this._detail.classList.remove("hidden");

    const createdAt = new Date(report.createdAt).toLocaleString("pt-BR");
    const startedAt = new Date(report.startedAt).toLocaleString("pt-BR");
    const completedAt = report.completedAt
      ? new Date(report.completedAt).toLocaleString("pt-BR")
      : "—";

    const duration = report.startedAt && report.completedAt
      ? this._formatDuration(new Date(report.completedAt) - new Date(report.startedAt))
      : "—";

    const p = report.payload;

    const bodyHtml = report.type === "cyclic"
      ? this._cyclicDetailBody(p)
      : this._qualityDetailBody(p);

    this._detail.innerHTML = `
      <div class="bg-card border-border rounded-2xl border shadow-sm overflow-hidden">
        <div class="border-border border-b px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <h3 class="font-bold text-lg leading-tight">${report.title}</h3>
            <p class="text-muted-foreground text-xs mt-1">
              Gerado em ${createdAt}
              ${report.testerName ? ` · Testador: <strong class="text-foreground">${report.testerName}</strong>` : ""}
            </p>
          </div>
          <button id="btn-export-pdf" class="bg-primary text-primary-foreground hover:bg-primary-hover flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold cursor-pointer transition-colors shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar PDF
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 border-b border-border divide-x divide-border">
          <div class="flex flex-col items-center justify-center gap-1 p-4">
            <p class="text-xs text-muted-foreground font-medium uppercase tracking-wide">Tipo</p>
            <p class="font-bold text-sm">${report.type === "cyclic" ? "Ciclagem" : "Qualidade"}</p>
          </div>
          <div class="flex flex-col items-center justify-center gap-1 p-4">
            <p class="text-xs text-muted-foreground font-medium uppercase tracking-wide">Status</p>
            ${this._statusBadge(report.status, report.type)}
          </div>
          <div class="flex flex-col items-center justify-center gap-1 p-4">
            <p class="text-xs text-muted-foreground font-medium uppercase tracking-wide">Início</p>
            <p class="font-semibold text-sm">${startedAt}</p>
          </div>
          <div class="flex flex-col items-center justify-center gap-1 p-4">
            <p class="text-xs text-muted-foreground font-medium uppercase tracking-wide">Duração</p>
            <p class="font-bold text-sm">${duration}</p>
          </div>
        </div>

        ${bodyHtml}
      </div>`;

    document.getElementById("btn-export-pdf")?.addEventListener("click", () => {
      this._exportPDF(report);
    });
  }

  _cyclicDetailBody(p) {
    const successRate = p.totalCycles > 0
      ? ((p.completedCycles / p.totalCycles) * 100).toFixed(1)
      : 0;

    const batteryDrop = (p.batteryStart != null && p.batteryEnd != null)
      ? `${p.batteryStart}% → ${p.batteryEnd}% (−${p.batteryStart - p.batteryEnd}%)`
      : "—";

    const logs = (p.logs || []).slice(-50);

    return `
      <div class="grid grid-cols-2 sm:grid-cols-4 border-b border-border divide-x divide-border">
        <div class="flex flex-col items-center justify-center gap-1 p-4">
          <p class="text-2xl font-bold tabular-nums">${p.completedCycles?.toFixed(0) ?? 0}</p>
          <p class="text-xs text-muted-foreground">de ${p.totalCycles} ciclos</p>
        </div>
        <div class="flex flex-col items-center justify-center gap-1 p-4">
          <p class="text-2xl font-bold tabular-nums text-destructive">${p.totalFailures ?? 0}</p>
          <p class="text-xs text-muted-foreground">Falhas</p>
        </div>
        <div class="flex flex-col items-center justify-center gap-1 p-4">
          <p class="text-2xl font-bold tabular-nums">${successRate}%</p>
          <p class="text-xs text-muted-foreground">Taxa de sucesso</p>
        </div>
        <div class="flex flex-col items-center justify-center gap-1 p-4">
          <p class="text-2xl font-bold tabular-nums">${batteryDrop}</p>
          <p class="text-xs text-muted-foreground">Variação de bateria</p>
        </div>
      </div>

      <div class="p-5">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Log de Eventos ${logs.length < (p.logs?.length ?? 0) ? `(últimos ${logs.length} de ${p.logs.length})` : ""}
        </h4>
        ${logs.length === 0
          ? `<p class="text-muted-foreground text-sm text-center py-6">Nenhum log registrado.</p>`
          : `<div class="overflow-hidden rounded-lg border border-border max-h-72 overflow-y-auto">
              <table class="w-full border-collapse text-sm">
                <thead class="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr class="text-muted-foreground text-xs uppercase tracking-wide">
                    <th class="px-3 py-2 text-left font-semibold w-36">Hora</th>
                    <th class="px-3 py-2 text-left font-semibold w-20">Tipo</th>
                    <th class="px-3 py-2 text-left font-semibold">Mensagem</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/50">
                  ${logs.map((l) => `
                    <tr class="hover:bg-muted/20 transition-colors">
                      <td class="px-3 py-1.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        ${new Date(l.timestamp).toLocaleString("pt-BR")}
                      </td>
                      <td class="px-3 py-1.5">${this._logTypeBadge(l.type)}</td>
                      <td class="px-3 py-1.5 text-xs ${this._logLevelClass(l.level)}">${l.message}</td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>`}
      </div>`;
  }

  _qualityDetailBody(p) {
    return `
      <div class="grid grid-cols-3 border-b border-border divide-x divide-border">
        <div class="flex flex-col items-center justify-center gap-1 p-4">
          <p class="text-2xl font-bold tabular-nums">${p.totalSteps}</p>
          <p class="text-xs text-muted-foreground">Etapas totais</p>
        </div>
        <div class="flex flex-col items-center justify-center gap-1 p-4">
          <p class="text-2xl font-bold tabular-nums text-green-600">${p.successCount}</p>
          <p class="text-xs text-muted-foreground">Aprovadas</p>
        </div>
        <div class="flex flex-col items-center justify-center gap-1 p-4">
          <p class="text-2xl font-bold tabular-nums text-destructive">${p.failCount}</p>
          <p class="text-xs text-muted-foreground">Reprovadas</p>
        </div>
      </div>

      <div class="p-5">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Detalhes por Etapa</h4>
        <div class="flex flex-col gap-2">
          ${(p.steps || []).map((s) => `
            <div class="rounded-lg border border-border bg-background px-4 py-3">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                  ${s.status === "sucesso"
                    ? `<div class="bg-green-500/20 text-green-500 rounded-full p-0.5 shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`
                    : `<div class="bg-red-500/20 text-red-500 rounded-full p-0.5 shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>`
                  }
                  <p class="text-sm font-semibold truncate">${s.name}</p>
                </div>
                ${s.errorMsg ? `<span class="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20 truncate max-w-xs" title="${s.errorMsg}">${s.errorMsg}</span>` : ""}
              </div>
              ${s.logs && s.logs.length > 0 ? `
                <div class="mt-2 pl-7 flex flex-col gap-1">
                  ${s.logs.map((log) => `
                    <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-1 rounded">
                      <span class="w-1.5 h-1.5 rounded-full bg-border shrink-0"></span>
                      <span>${log}</span>
                    </div>`).join("")}
                </div>` : ""}
            </div>`).join("")}
        </div>
      </div>`;
  }

  async _deleteReport(id) {
    try {
      await reportApi.remove(id);
      this._reports = this._reports.filter((r) => r.id !== id);
      if (this._selectedId === id) {
        this._selectedId = null;
        if (this._detail) this._detail.classList.add("hidden");
      }
      this._renderList();
      toast.success("Relatório removido.");
    } catch {
      toast.error("Erro ao remover relatório.");
    }
  }

  // ── Exportação PDF via jsPDF (carregado por CDN) ──────────
  async _exportPDF(report) {
    if (!window.jspdf) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      document.head.appendChild(script);
      await new Promise((res) => { script.onload = res; });
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

    // Cabeçalho
    doc.setFillColor(214, 31, 103);
    doc.rect(0, 0, 210, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("PADO TESTLOCK — RELATÓRIO DE TESTE", margin, 8);
    doc.text(new Date().toLocaleString("pt-BR"), 210 - margin, 8, { align: "right" });

    y = 22;

    line(report.title, 14, "bold");
    y += 1;

    const typeLabel = report.type === "cyclic" ? "Ciclagem" : "Qualidade";
    line(`Tipo: ${typeLabel}   ·   Status: ${report.status.toUpperCase()}`, 9, "normal", [80, 80, 80]);
    y += 2;
    hLine();

    // Informações gerais
    line("Informações Gerais", 11, "bold");
    y += 1;
    kv("Fechadura", report.lockAlias);
    kv("ID da Fechadura", report.lockId);
    kv("Testador", report.testerName || "—");
    kv("Início", new Date(report.startedAt).toLocaleString("pt-BR"));
    kv("Conclusão", report.completedAt ? new Date(report.completedAt).toLocaleString("pt-BR") : "—");
    if (report.startedAt && report.completedAt) {
      kv("Duração", this._formatDuration(new Date(report.completedAt) - new Date(report.startedAt)));
    }
    y += 2;
    hLine();

    if (report.type === "cyclic") {
      line("Resultado da Ciclagem", 11, "bold");
      y += 1;
      kv("Ciclos realizados", `${p.completedCycles?.toFixed(0) ?? 0} / ${p.totalCycles}`);
      kv("Taxa de sucesso", `${p.totalCycles > 0 ? ((p.completedCycles / p.totalCycles) * 100).toFixed(1) : 0}%`);
      kv("Total de falhas", p.totalFailures ?? 0);
      kv("Intervalo entre ciclos", `${p.delayBetweenCycles}s`);
      kv("Falhas máx. consecutivas", p.maxConsecutiveFailures);
      kv("Bateria inicial", p.batteryStart != null ? `${p.batteryStart}%` : "—");
      kv("Bateria final", p.batteryEnd != null ? `${p.batteryEnd}%` : "—");
      if (p.lockMac) kv("MAC Address", p.lockMac);
      y += 2;
      hLine();

      // Logs (últimos 40)
      const logs = (p.logs || []).slice(-40);
      if (logs.length > 0) {
        line(`Log de Eventos (últimos ${logs.length})`, 11, "bold");
        y += 1;
        logs.forEach((l) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          const time = new Date(l.timestamp).toLocaleTimeString("pt-BR");
          doc.text(`${time}  [${l.type}]  ${l.message}`, margin, y);
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
        if (y > 265) { doc.addPage(); y = 20; }
        const icon = s.status === "sucesso" ? "✓" : "✗";
        const color = s.status === "sucesso" ? [22, 163, 74] : [220, 38, 38];
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...color);
        doc.text(icon, margin, y);
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
        if (s.logs && s.logs.length > 0) {
          s.logs.forEach((log) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(110, 110, 110);
            doc.text(`  → ${log}`, margin + 8, y);
            y += 4;
          });
        }
        y += 1;
      });
    }

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 160);
      doc.text(`Pado TestLock · Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
    }

    const safeName = report.title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
    doc.save(`relatorio_${safeName}.pdf`);
    toast.success("PDF exportado com sucesso!");
  }

  // ── Helpers ───────────────────────────────────────────────
  _statusBadge(status, type) {
    const map = {
      completed:  "bg-blue-500/10 text-blue-600 border-blue-500/20",
      aprovado:   "bg-green-500/10 text-green-600 border-green-500/20",
      reprovado:  "bg-destructive/10 text-destructive border-destructive/20",
      failed:     "bg-destructive/10 text-destructive border-destructive/20",
      stopped:    "bg-muted text-muted-foreground border-border",
    };
    const labels = {
      completed: "Concluído",
      aprovado:  "Aprovado",
      reprovado: "Reprovado",
      failed:    "Falhou",
      stopped:   "Interrompido",
    };
    const cls = map[status] || "bg-muted text-muted-foreground border-border";
    return `<span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}">${labels[status] || status}</span>`;
  }

  _logTypeBadge(type) {
    const styles = {
      UNLOCK:  "bg-green-500/10 text-green-700",
      LOCK:    "bg-blue-500/10 text-blue-700",
      BATTERY: "bg-yellow-500/10 text-yellow-700",
      SYSTEM:  "bg-muted text-muted-foreground",
    };
    return `<span class="rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${styles[type] || styles.SYSTEM}">${type}</span>`;
  }

  _logLevelClass(level) {
    return { success: "text-green-600", error: "text-destructive", warning: "text-yellow-600", info: "text-muted-foreground" }[level] || "text-muted-foreground";
  }

  _formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  _iconCyclic() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-10.02l5.67-5.67"/></svg>`;
  }

  _iconQuality() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
  }
}

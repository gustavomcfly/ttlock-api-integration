import { fingerprintApi } from "../api/fingerprintApi.js";
import { localizeMessage } from "../utils/errors.js";
import { session } from "../utils/session.js";
import { appState } from "../state/appState.js";
import { toast } from "../utils/toast.js";

export class FingerprintPanel {
  constructor() {
    this.selectedType = 1;

    this.tabs = document.querySelectorAll(".fingerprint-tab");
    this.dateFields = document.getElementById("fingerprint-date-fields");
    this.inputName = document.getElementById("input-fingerprint-name");
    this.inputNumber = document.getElementById("input-fingerprint-number");
    this.startDateInput = document.getElementById("fingerprint-start-date");
    this.endDateInput = document.getElementById("fingerprint-end-date");
    this.btnAdd = document.getElementById("btn-add-fingerprint");
    this.btnAddText = document.getElementById("btn-add-fingerprint-text");
    this.lockNameEl = document.getElementById("fingerprint-lock-name");

    this.resultPanel = document.getElementById("fingerprint-result");
    this.errorPanel = document.getElementById("fingerprint-error");
    this.errorText = document.getElementById("fingerprint-error-text");

    // Table Elements
    this.btnRefreshList = document.getElementById("btn-refresh-fingerprints");
    this.table = document.getElementById("fingerprint-table");
    this.tbody = document.getElementById("fingerprint-list-body");
    this.emptyText = document.getElementById("no-fingerprints");

    this.bindEvents();
    this.applyType(1);
  }

  bindEvents() {
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const type = parseInt(tab.getAttribute("data-type"));
        this.applyType(type);
      });
    });

    if (this.btnAdd) {
      this.btnAdd.addEventListener("click", () => this.addFingerprint());
    }

    if (this.btnRefreshList) {
      this.btnRefreshList.addEventListener("click", () =>
        this.fetchFingerprints(),
      );
    }

    if (this.tbody) {
      this.tbody.addEventListener("click", (e) => this.handleTableAction(e));
    }
  }

  syncLock() {
    if (this.lockNameEl && appState.selectedLockName) {
      this.lockNameEl.innerText = appState.selectedLockName;
    }
    this.resetResult();
    this.fetchFingerprints(); // Auto-load list when entering panel
  }

  applyType(type) {
    this.selectedType = type;

    this.tabs.forEach((tab) => {
      const t = parseInt(tab.getAttribute("data-type"));
      if (t === type) {
        tab.className =
          "fingerprint-tab active-tab px-4 py-2 rounded-lg text-sm font-semibold transition-all border bg-secondary text-secondary-foreground border-secondary/20 shadow-sm cursor-pointer";
      } else {
        tab.className =
          "fingerprint-tab px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer";
      }
    });

    if (this.dateFields) {
      this.dateFields.style.display = type === 2 ? "flex" : "none";
    }

    if (type === 2) {
      if (!this.startDateInput.value)
        this.startDateInput.value = this.formatDatetimeLocal(new Date());
      if (!this.endDateInput.value) {
        const future = new Date();
        future.setDate(future.getDate() + 30);
        this.endDateInput.value = this.formatDatetimeLocal(future);
      }
    }

    this.resetResult();
  }

  resetResult() {
    if (this.resultPanel) this.resultPanel.classList.add("hidden");
    if (this.errorPanel) this.errorPanel.classList.add("hidden");
  }

  async addFingerprint() {
    if (!appState.selectedLockId)
      return toast.error("Nenhuma fechadura selecionada.");

    const name = this.inputName.value.trim() || "Biometria";
    const number = this.inputNumber.value.trim();

    if (!number) {
      return toast.error(
        "O número da biometria é obrigatório para registro via Gateway.",
      );
    }

    let startDate = 0;
    let endDate = 0;

    if (this.selectedType === 2) {
      if (!this.startDateInput.value || !this.endDateInput.value) {
        return toast.error("Preencha as datas de início e término.");
      }
      startDate = new Date(this.startDateInput.value).getTime();
      endDate = new Date(this.endDateInput.value).getTime();

      if (endDate <= startDate)
        return toast.error(
          "A data de término deve ser posterior à data de início.",
        );
    }

    this.btnAdd.disabled = true;
    this.btnAddText.innerText = "Comunicando com o Gateway...";
    this.resetResult();

    try {
      const data = await fingerprintApi.addFingerprint({
        accessToken: session.getToken(),
        lockId: appState.selectedLockId,
        fingerprintNumber: number,
        name: name,
        startDate: startDate,
        endDate: endDate,
      });

      if (!data.errcode || data.errcode === 0 || data.fingerprintId) {
        toast.success("Biometria sincronizada com sucesso!");
        this.resultPanel.classList.remove("hidden");
        this.inputName.value = "";
        this.inputNumber.value = "";

        // Refresh Table Automatically
        this.fetchFingerprints();
      } else {
        this.errorText.innerText =
          localizeMessage(data.errmsg) || "O Gateway não conseguiu registrar a biometria.";
        this.errorPanel.classList.remove("hidden");
      }
    } catch (err) {
      console.error(err);
      this.errorText.innerText = "Falha de conexão com o servidor proxy.";
      this.errorPanel.classList.remove("hidden");
    } finally {
      this.btnAdd.disabled = false;
      this.btnAddText.innerText = "Adicionar Biometria via Gateway";
    }
  }

  formatDatetimeLocal(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // --- LIST, EDIT, DELETE METHODS ---

  async fetchFingerprints() {
    if (!appState.selectedLockId) return;

    if (this.btnRefreshList) this.btnRefreshList.innerText = "Carregando...";

    try {
      const data = await fingerprintApi.getFingerprintList(
        session.getToken(),
        appState.selectedLockId,
        1,
        20,
      );
      console.log("🔍 TTLock API Response (Fingerprints):", data);

      if (data.errcode && data.errcode !== 0) {
        toast.error(
          "Erro da API: " + (data.errmsg || `Código ${data.errcode}`),
        );
        this.renderFingerprints([]);
        return;
      }

      let list = [];
      if (Array.isArray(data.list)) {
        list = data.list;
      } else if (data.data && Array.isArray(data.data.list)) {
        list = data.data.list;
      }

      this.renderFingerprints(list);
    } catch (err) {
      console.error("Fetch Fingerprints Error:", err);
      toast.error("Falha ao buscar lista de biometrias.");
      this.renderFingerprints([]);
    } finally {
      if (this.btnRefreshList)
        this.btnRefreshList.innerText = "Atualizar Lista";
    }
  }

  renderFingerprints(list) {
    this.tbody.innerHTML = "";

    if (list.length === 0) {
      this.emptyText.style.display = "block";
      this.table.style.display = "none";
      return;
    }

    this.emptyText.style.display = "none";
    this.table.style.display = "table";

    list.forEach((item) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-muted/30 transition-colors group";

      // Date Formatting
      const startDateStr = item.startDate
        ? new Date(item.startDate).toLocaleDateString()
        : "";
      const endDateStr = item.endDate
        ? new Date(item.endDate).toLocaleDateString()
        : "";
      const validade =
        item.startDate === 0 && item.endDate === 0
          ? "Permanente"
          : `${startDateStr} - ${endDateStr}`;

      const isActive = item.status === undefined || item.status === 1;
      const statusClass = isActive
        ? "bg-green-500/10 text-green-500 border border-green-500/20"
        : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
      const statusText = isActive ? "Válida" : "Inativa";

      tr.innerHTML = `
        <td class="px-6 py-4 text-center whitespace-nowrap font-medium group-hover:text-primary transition-colors">${item.fingerprintName || "Sem Nome"}</td>
        <td class="px-6 py-4 text-center whitespace-nowrap font-mono text-muted-foreground text-xs">${item.fingerprintNumber || item.fingerprintId || "N/A"}</td>
        <td class="px-6 py-4 text-center whitespace-nowrap text-muted-foreground text-sm">${validade}</td>
        <td class="px-6 py-4 text-center whitespace-nowrap">
            <span class="px-2.5 py-1.5 rounded-full text-xs font-bold ${statusClass}">${statusText}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-center">
            <div class="flex items-center justify-center gap-2">
              <button class="btn-edit inline-flex items-center justify-center gap-1 bg-primary/10 text-primary hover:bg-primary/50 hover:text-primary-foreground px-3 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer" data-id="${item.fingerprintId}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                Editar
              </button>
              <button class="btn-delete inline-flex items-center justify-center gap-1 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground px-3 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer" data-id="${item.fingerprintId}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                Excluir
              </button>
            </div>
        </td>
      `;
      this.tbody.appendChild(tr);
    });
  }

  async handleTableAction(e) {
    const editBtn = e.target.closest(".btn-edit");
    const delBtn = e.target.closest(".btn-delete");

    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      this.promptEditFingerprint(id);
    } else if (delBtn) {
      const id = delBtn.getAttribute("data-id");
      this.deleteFingerprint(id);
    }
  }

  async promptEditFingerprint(id) {
    const daysStr = prompt(
      "Atenção: A fechadura precisa estar conectada ao Gateway.\n\nDigite 0 para tornar a validade PERMANENTE, ou digite a quantidade de DIAS de validade que deseja definir a partir de agora:",
    );

    if (daysStr === null) return;
    const days = parseInt(daysStr);

    if (isNaN(days) || days < 0) {
      return toast.error(
        "Por favor, digite um número válido maior ou igual a 0.",
      );
    }

    let startDate = 0;
    let endDate = 0;

    if (days > 0) {
      startDate = new Date().getTime();
      endDate = startDate + days * 24 * 60 * 60 * 1000;
    }

    try {
      const data = await fingerprintApi.changePeriod({
        accessToken: session.getToken(),
        lockId: appState.selectedLockId,
        fingerprintId: id,
        startDate: startDate,
        endDate: endDate,
      });

      if (data.errcode === 0) {
        toast.success("Validade da biometria alterada com sucesso!");
        this.fetchFingerprints();
      } else {
        toast.error(
          "Falha ao alterar validade: " + (data.errmsg || "Erro no Gateway"),
        );
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    }
  }

  async deleteFingerprint(id) {
    if (
      !confirm(
        "Atenção: A fechadura precisa estar conectada ao Gateway.\n\nTem certeza que deseja excluir esta biometria permanentemente?",
      )
    )
      return;

    try {
      const data = await fingerprintApi.deleteFingerprint(
        session.getToken(),
        appState.selectedLockId,
        id,
      );
      if (data.errcode === 0) {
        toast.success("Biometria excluída via Gateway com sucesso!");
        this.fetchFingerprints();
      } else {
        toast.error(
          "Falha ao excluir biometria: " + (data.errmsg || "Erro no Gateway"),
        );
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    }
  }
}

import { passcodeApi } from "../api/passcodeApi.js";
import { session } from "../utils/session.js";
import { appState } from "../state/appState.js";
import { toast } from "../utils/toast.js";

const TYPE_INFO = {
  2: {
    label: "Permanente",
    description:
      "Senha aleatória válida indefinidamente. Pode ser usada qualquer número de vezes.",
    hasDates: false,
    isCustom: false,
  },
  3: {
    label: "Temporária",
    description:
      "Senha aleatória válida dentro de um intervalo de datas. (Minutos serão zerados).",
    hasDates: true,
    isCustom: false,
  },
  1: {
    label: "Uso Único",
    description: "Senha aleatória que expira após a primeira utilização.",
    hasDates: false,
    isCustom: false,
  },
  4: {
    label: "Apagar Senha",
    description:
      "Código especial que apaga todas as senhas da fechadura quando digitado no teclado.",
    hasDates: false,
    isCustom: false,
  },
  6: {
    label: "Cíclica",
    description:
      "Cria uma senha personalizada via Gateway. Repete-se nos dias e horários selecionados.",
    hasDates: true,
    isCustom: true,
  },
};

export class PasscodePanel {
  constructor() {
    this.selectedType = 2;

    this.tabs = document.querySelectorAll(".passcode-tab");
    this.dateFields = document.getElementById("passcode-date-fields");
    this.cyclicFields = document.getElementById("passcode-cyclic-fields");
    this.customInputGroup = document.getElementById(
      "passcode-custom-input-group",
    );
    this.inputCustomPasscode = document.getElementById("input-custom-passcode");
    this.descText = document.getElementById("passcode-type-desc-text");
    this.startDateInput = document.getElementById("passcode-start-date");
    this.endDateInput = document.getElementById("passcode-end-date");
    this.startTimeInput = document.getElementById("passcode-start-time");
    this.endTimeInput = document.getElementById("passcode-end-time");
    this.btnGenerate = document.getElementById("btn-generate-passcode");
    this.btnGenerateText = document.getElementById("btn-generate-text");
    this.resultPanel = document.getElementById("passcode-result");
    this.resultValue = document.getElementById("passcode-result-value");
    this.resultValidity = document.getElementById("passcode-result-validity");
    this.errorPanel = document.getElementById("passcode-error");
    this.errorText = document.getElementById("passcode-error-text");
    this.inputName = document.getElementById("input-passcode-name");
    this.lockNameEl = document.getElementById("passcode-lock-name");

    // Table Elements
    this.btnRefreshList = document.getElementById("btn-refresh-passcodes");
    this.table = document.getElementById("passcode-table");
    this.tbody = document.getElementById("passcode-list-body");
    this.emptyText = document.getElementById("no-passcodes");

    this.bindEvents();
    this.applyType(2);
  }

  bindEvents() {
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const type = parseInt(tab.getAttribute("data-type"));
        this.applyType(type);
      });
    });

    if (this.btnGenerate) {
      this.btnGenerate.addEventListener("click", () => this.generatePasscode());
    }

    if (this.btnRefreshList) {
      this.btnRefreshList.addEventListener("click", () =>
        this.fetchPasscodes(),
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
    this.fetchPasscodes(); // Auto-load list when entering panel
  }

  applyType(type) {
    this.selectedType = type;

    this.tabs.forEach((tab) => {
      const t = parseInt(tab.getAttribute("data-type"));
      if (t === type) {
        tab.className =
          "passcode-tab active-tab bg-secondary text-secondary-foreground border-secondary px-4 py-2 rounded-lg text-sm font-semibold transition-all border shadow-sm cursor-pointer";
      } else {
        tab.className =
          "passcode-tab px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer";
      }
    });

    const info = TYPE_INFO[type];
    if (this.descText) this.descText.innerText = info.description;

    this.dateFields.style.display = info.hasDates ? "flex" : "none";
    this.cyclicFields.style.display = info.isCustom ? "flex" : "none";
    this.customInputGroup.style.display = info.isCustom ? "flex" : "none";
    this.btnGenerateText.innerText = info.isCustom
      ? "Registrar Senha via Gateway"
      : "Gerar Senha Aleatória";

    if (info.hasDates) {
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

  async generatePasscode() {
    if (!appState.selectedLockId)
      return toast.error("Nenhuma fechadura selecionada.");

    const info = TYPE_INFO[this.selectedType];
    const passcodeName = this.inputName.value.trim() || "Senha " + info.label;
    let startDate = null;
    let endDate = null;

    if (info.hasDates) {
      if (!this.startDateInput.value || !this.endDateInput.value) {
        return toast.error("Preencha as datas de início e término.");
      }
      const startObj = new Date(this.startDateInput.value);
      const endObj = new Date(this.endDateInput.value);

      if (!info.isCustom) {
        startObj.setMinutes(0, 0, 0);
        endObj.setMinutes(0, 0, 0);
      }

      startDate = startObj.getTime();
      endDate = endObj.getTime();

      if (endDate <= startDate)
        return toast.error(
          "A data de término deve ser posterior à data de início.",
        );
    }

    this.btnGenerate.disabled = true;
    this.btnGenerateText.innerText = "Processando...";
    this.resetResult();

    try {
      let data;

      if (info.isCustom) {
        const customCode = this.inputCustomPasscode.value.trim();
        if (!customCode || customCode.length < 4 || customCode.length > 9) {
          throw new Error("A senha deve ter entre 4 e 9 dígitos.");
        }

        const checkedDays = Array.from(
          document.querySelectorAll(".day-checkbox:checked"),
        )
          .map((cb) => cb.value)
          .join(",");
        if (!checkedDays)
          throw new Error("Selecione pelo menos um dia da semana.");

        const startTime = this.startTimeInput.value;
        const endTime = this.endTimeInput.value;

        data = await passcodeApi.addCustomPasscode({
          accessToken: session.getToken(),
          lockId: appState.selectedLockId,
          passcode: customCode,
          name: passcodeName,
          startDate: startDate,
          endDate: endDate,
          isAllDay: 2,
          weekDays: checkedDays,
          startTime: startTime,
          endTime: endTime,
        });
      } else {
        data = await passcodeApi.generateRandomPasscode(
          session.getToken(),
          appState.selectedLockId,
          this.selectedType,
          startDate,
          endDate,
          passcodeName,
        );
      }

      if (!data.errcode || data.errcode === 0 || data.keyboardPwdId) {
        const code =
          data.keyboardPwd || this.inputCustomPasscode.value || "------";
        this.showResult(code, startDate, endDate, info);
        toast.success("Senha registrada com sucesso!");
        this.inputCustomPasscode.value = "";
        this.inputName.value = "";

        // Refresh Table Automatically
        this.fetchPasscodes();
      } else {
        this.showError(data.errmsg || "Falha na operação.");
      }
    } catch (err) {
      this.showError(err.message || "Falha de conexão com o servidor.");
    } finally {
      this.btnGenerate.disabled = false;
      this.btnGenerateText.innerText = info.isCustom
        ? "Registrar Senha via Gateway"
        : "Gerar Senha Aleatória";
    }
  }

  showResult(code, startDate, endDate, info) {
    this.resultValue.innerText = code;
    this.resultValidity.innerText = info.isCustom
      ? "Senha enviada remotamente via Gateway"
      : "Senha offline gerada com sucesso";
    this.resultPanel.classList.remove("hidden");
  }

  showError(message) {
    this.errorText.innerText = message;
    this.errorPanel.classList.remove("hidden");
  }

  formatDatetimeLocal(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
  }

  // --- LIST, EDIT, DELETE METHODS ---

  async fetchPasscodes() {
    if (!appState.selectedLockId) return;

    if (this.btnRefreshList) this.btnRefreshList.innerText = "Carregando...";

    try {
      // FIX: Lowered pageSize to 20. TTLock sometimes silently fails on large page sizes!
      const data = await passcodeApi.getPasscodeList(
        session.getToken(),
        appState.selectedLockId,
        1,
        20,
      );

      console.log("🔍 TTLock API Response (Passcodes):", data);

      if (data.errcode && data.errcode !== 0) {
        toast.error(
          "Erro da API: " + (data.errmsg || `Código ${data.errcode}`),
        );
        this.renderPasscodes([]);
        return;
      }

      // Sometimes TTLock wraps the array depending on the lock version
      let list = [];
      if (Array.isArray(data.list)) {
        list = data.list;
      } else if (data.data && Array.isArray(data.data.list)) {
        list = data.data.list;
      }

      this.renderPasscodes(list);
    } catch (err) {
      console.error("Fetch Passcodes Error:", err);
      toast.error("Falha ao buscar lista de senhas.");
      this.renderPasscodes([]);
    } finally {
      if (this.btnRefreshList)
        this.btnRefreshList.innerText = "Atualizar Lista";
    }
  }

  renderPasscodes(list) {
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

      const typeMap = {
        1: "Uso Único",
        2: "Permanente",
        3: "Temporária",
        4: "Apagar",
        6: "Cíclica",
      };
      const typeLabel = typeMap[item.keyboardPwdType] || "Outro";

      // Default to true for display purposes if status isn't strictly defined by Sciener
      const isActive = item.status === undefined || item.status === 1;
      const statusClass = isActive
        ? "bg-green-500/10 text-green-500 border border-green-500/20"
        : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
      const statusText = isActive ? "Válida" : "Inativa";

      tr.innerHTML = `
        <td class="px-6 py-4 text-center whitespace-nowrap font-medium group-hover:text-primary transition-colors">${item.keyboardPwdName || "Sem Nome"}</td>
        <td class="px-6 py-4 text-center whitespace-nowrap font-mono font-bold tracking-widest">${item.keyboardPwd}</td>
        <td class="px-6 py-4 text-center whitespace-nowrap text-muted-foreground text-sm">${typeLabel}</td>
        <td class="px-6 py-4 text-center whitespace-norap">
            <span class="px-2.5 py-1.5 rounded-full text-xs font-bold ${statusClass}">${statusText}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-center">
            <div class="flex items-center justify-center gap-2">
              <button class="btn-edit inline-flex items-center justify-center gap-1 bg-primary/10 text-primary hover:bg-primary/50 hover:text-primary-foreground px-3 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer" data-id="${item.keyboardPwdId}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                Editar
              </button>
              <button class="btn-delete inline-flex items-center justify-center gap-1 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground px-3 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer" data-id="${item.keyboardPwdId}">
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
      this.promptEditPasscode(id);
    } else if (delBtn) {
      const id = delBtn.getAttribute("data-id");
      this.deletePasscode(id);
    }
  }

  async promptEditPasscode(id) {
    const newPwd = prompt(
      "Atenção: A fechadura precisa estar conectada ao Gateway.\n\nDigite a nova senha (4 a 9 dígitos):",
    );
    if (!newPwd) return;

    if (newPwd.length < 4 || newPwd.length > 9) {
      return toast.error("A senha deve ter entre 4 e 9 dígitos.");
    }

    try {
      const data = await passcodeApi.changePasscode(
        session.getToken(),
        appState.selectedLockId,
        id,
        newPwd,
      );
      if (data.errcode === 0) {
        toast.success("Senha alterada no Gateway com sucesso!");
        this.fetchPasscodes();
      } else {
        toast.error(
          "Falha ao alterar senha: " + (data.errmsg || "Erro no Gateway"),
        );
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    }
  }

  async deletePasscode(id) {
    if (
      !confirm(
        "Atenção: A fechadura precisa estar conectada ao Gateway.\n\nTem certeza que deseja excluir esta senha permanentemente?",
      )
    )
      return;

    try {
      const data = await passcodeApi.deletePasscode(
        session.getToken(),
        appState.selectedLockId,
        id,
      );
      if (data.errcode === 0) {
        toast.success("Senha excluída via Gateway com sucesso!");
        this.fetchPasscodes();
      } else {
        toast.error(
          "Falha ao excluir senha: " + (data.errmsg || "Erro no Gateway"),
        );
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    }
  }
}

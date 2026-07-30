import { recordApi } from "../api/recordApi.js";
import { session } from "../utils/session.js";
import { appState } from "../state/appState.js";
import { toast } from "../utils/toast.js";

export class RecordPanel {
  constructor() {
    this.table = document.getElementById("record-table");
    this.tbody = document.getElementById("record-list-body");
    this.emptyText = document.getElementById("no-records");
    this.btnRefreshList = document.getElementById("btn-refresh-records");
    this.btnClearList = document.getElementById("btn-clear-records");
    this.bindEvents();
  }

  bindEvents() {
    if (this.btnRefreshList)
      this.btnRefreshList.addEventListener("click", () => this.fetchRecords());
    if (this.btnClearList)
      this.btnClearList.addEventListener("click", () => this.clearRecords());
  }

  syncLock() {
    this.fetchRecords();
  }

  async fetchRecords() {
    if (!appState.selectedLockId) return;
    if (this.btnRefreshList) this.btnRefreshList.innerText = "Carregando...";
    try {
      const data = await recordApi.getRecords(
        session.getToken(),
        appState.selectedLockId,
        1,
        50,
      );

      if (data.errcode && data.errcode !== 0) {
        toast.error(
          "Erro da API: " + (data.errmsg || `Código ${data.errcode}`),
        );
        this.renderRecords([]);
        return;
      }
      let list = [];
      if (Array.isArray(data.list)) list = data.list;
      else if (data.data && Array.isArray(data.data.list))
        list = data.data.list;
      this.renderRecords(list);
    } catch (err) {
      toast.error("Falha ao buscar histórico de aberturas.");
      this.renderRecords([]);
    } finally {
      if (this.btnRefreshList) this.btnRefreshList.innerText = "Atualizar";
    }
  }

  async clearRecords() {
    if (!appState.selectedLockId) return;
    if (
      !confirm(
        "Atenção: Esta ação limpará todo o histórico de aberturas desta fechadura.\n\nDeseja continuar?",
      )
    )
      return;
    if (this.btnClearList) {
      this.btnClearList.disabled = true;
      this.btnClearList.innerText = "Limpando...";
    }
    try {
      const data = await recordApi.clearRecords(
        session.getToken(),
        appState.selectedLockId,
      );
      if (data.errcode === 0) {
        toast.success("Histórico limpo com sucesso!");
        this.fetchRecords();
      } else {
        toast.error(
          "Falha ao limpar histórico: " + (data.errmsg || "Erro no Gateway"),
        );
      }
    } catch (err) {
      toast.error("Erro de conexão ao limpar histórico.");
    } finally {
      if (this.btnClearList) {
        this.btnClearList.disabled = false;
        this.btnClearList.innerText = "Limpar Histórico";
      }
    }
  }

  renderRecords(list) {
    this.tbody.innerHTML = "";
    if (list.length === 0) {
      this.emptyText.classList.remove("hidden");
      this.table.classList.add("hidden");
      return;
    }

    this.emptyText.classList.add("hidden");
    this.table.classList.remove("hidden");

    const getMethodName = (type) => {
      const types = {
        1: "App (Bluetooth)",
        4: "Senha",
        7: "Cartão RFID",
        8: "Biometria",
        9: "Gateway (Remoto)",
        10: "Desbloqueio Automático",
        11: "TestLock",
        12: "TestLock",
      };
      return types[type] || `Outro (${type})`;
    };

    list.forEach((item) => {
      const tr = document.createElement("tr");
      tr.className =
        "flex flex-col md:table-row p-4 md:p-0 hover:bg-muted/30 transition-colors group border-b border-border last:border-0 md:border-b-0";

      const dateObj = new Date(item.lockDate || item.serverDate);
      const dateStr = dateObj.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const methodName = getMethodName(item.recordType);
      const userName = item.username || item.keyboardPwd || "Desconhecido";
      const successBadge =
        item.success !== 0
          ? '<span class="px-2.5 py-1.5 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">Sucesso</span>'
          : '<span class="px-2.5 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">Falha</span>';

      tr.innerHTML = `
        <td class="flex justify-between items-center md:table-cell py-1.5 md:py-4 md:px-6 md:text-center">
            <span class="md:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data/Hora</span>
            <span class="text-sm text-muted-foreground text-right md:text-center">${dateStr}</span>
        </td>
        <td class="flex justify-between items-center md:table-cell py-1.5 md:py-4 md:px-6 md:text-center">
            <span class="md:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuário/Descrição</span>
            <span class="font-medium group-hover:text-primary transition-colors text-right md:text-center">${userName}</span>
        </td>
        <td class="flex justify-between items-center md:table-cell py-1.5 md:py-4 md:px-6 md:text-center">
            <span class="md:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wider">Método</span>
            <span class="text-muted-foreground text-sm text-right md:text-center">${methodName}</span>
        </td>
        <td class="flex justify-between items-center md:table-cell py-1.5 md:py-4 md:px-6 md:text-center">
            <span class="md:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
            <div class="text-right md:flex md:justify-center">${successBadge}</div>
        </td>
      `;
      this.tbody.appendChild(tr);
    });
  }
}

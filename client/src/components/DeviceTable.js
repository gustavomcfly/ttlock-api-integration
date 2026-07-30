import { lockApi } from "../api/lockApi.js";
import { session } from "../utils/session.js";
import { appState } from "../state/appState.js";
import { toast } from "../utils/toast.js";

export class DeviceTable {
  constructor(onLockSelected) {
    this.container = document.getElementById("device-table");
    this.tbody = document.getElementById("device-list-body");
    this.btnFetchLocks = document.getElementById("btn-fetch-locks");
    this.emptyText = document.getElementById("no-devices");

    this.tabOnline = document.getElementById("tab-online");
    this.tabOffline = document.getElementById("tab-offline");

    this.onLockSelected = onLockSelected;

    this.allLocks = [];
    this.currentTab = "online";

    this.bindEvents();
  }

  bindEvents() {
    if (this.btnFetchLocks)
      this.btnFetchLocks.addEventListener("click", () => this.fetchLocks());

    if (this.tabOnline && this.tabOffline) {
      this.tabOnline.addEventListener("click", () => this.switchTab("online"));
      this.tabOffline.addEventListener("click", () =>
        this.switchTab("offline"),
      );
    }

    this.tbody.addEventListener("click", (e) => this.handleSelection(e));
  }

  enable() {
    if (this.btnFetchLocks) this.btnFetchLocks.disabled = false;
  }

  async fetchLocks() {
    const token = session.getToken();
    if (this.btnFetchLocks) this.btnFetchLocks.innerText = "Carregando...";

    try {
      const data = await lockApi.fetchLocks(token);
      this.allLocks = data.list || [];
      this.render();
      toast.info(`${this.allLocks.length} fechaduras carregadas.`);
    } catch (err) {
      toast.error("Falha ao tentar encontrar dispositivos.");
      console.error(err);
    } finally {
      if (this.btnFetchLocks)
        this.btnFetchLocks.innerText = "Encontrar Dispositivos";
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    const activeClass =
      "active-tab bg-background text-foreground shadow-sm px-5 py-1.5 rounded-md text-sm font-bold transition-all cursor-pointer w-1/2 sm:w-auto";
    const inactiveClass =
      "text-muted-foreground hover:text-foreground px-5 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer w-1/2 sm:w-auto";

    if (tabName === "online") {
      this.tabOnline.className = activeClass;
      this.tabOffline.className = inactiveClass;
    } else {
      this.tabOffline.className = activeClass;
      this.tabOnline.className = inactiveClass;
    }

    this.render();
  }

  render() {
    this.tbody.innerHTML = "";

    if (this.allLocks.length === 0) {
      this.emptyText.innerText = "Não há fechaduras vinculadas a esta conta.";
      this.emptyText.classList.remove("hidden");
      this.container.classList.add("hidden");
      return;
    }

    const filteredLocks = this.allLocks.filter((lock) => {
      return this.currentTab === "online"
        ? lock.hasGateway === 1
        : lock.hasGateway === 0;
    });

    if (filteredLocks.length === 0) {
      const statusText = this.currentTab === "online" ? "online" : "offline";
      this.emptyText.innerText = `Nenhuma fechadura ${statusText} encontrada.`;
      this.emptyText.classList.remove("hidden");
      this.container.classList.add("hidden");
      return;
    }

    this.emptyText.classList.add("hidden");
    this.container.classList.remove("hidden");

    filteredLocks.forEach((lock) => {
      const tr = document.createElement("tr");
      const lockName = lock.lockAlias || "Sem Nome";

      tr.className =
        "block md:table-row hover:bg-muted/30 transition-colors group border-b border-border last:border-0 md:border-b-0 p-4 md:p-0";

      tr.innerHTML = `
        <td class="block md:table-cell p-2 md:py-4 md:px-6 align-middle">
            <div class="flex justify-between items-center md:block md:text-center">
                <span class="md:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fechadura</span>
                <span class="font-medium group-hover:text-primary transition-colors text-right md:text-left">${lockName}</span>
            </div>
        </td>
        <td class="block md:table-cell p-2 md:py-4 md:px-6 align-middle">
            <div class="flex justify-between items-center md:block md:text-center">
                <span class="md:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</span>
                <span class="text-muted-foreground text-right md:text-center">${lock.lockId}</span>
            </div>
        </td>
        <td class="block md:table-cell p-2 md:py-4 md:px-6 align-middle">
            <div class="flex justify-between items-center md:flex md:justify-center md:text-center">
                <span class="md:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bateria</span>
                <div class="text-right md:text-center">
                  <span class="px-2.5 py-1.5 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 inline-block">
                      ${lock.electricQuantity || 0}%
                  </span>
                </div>
            </div>
        </td>
        <td class="block md:table-cell p-2 md:py-4 md:px-6 align-middle">
            <div class="flex justify-center items-center md:block mt-3 md:mt-0 md:text-center">
                <button class="select-btn w-full md:w-auto inline-flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-4 py-3 md:py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer" data-id="${lock.lockId}" data-name="${lockName}">
                    Selecionar
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
            </div>
        </td>
      `;
      this.tbody.appendChild(tr);
    });
  }

  handleSelection(event) {
    const button = event.target.closest(".select-btn");

    if (button) {
      const id = button.getAttribute("data-id");
      const name = button.getAttribute("data-name");

      appState.setLock(id, name);

      if (this.onLockSelected) {
        this.onLockSelected(id, name);
      }
    }
  }
}

import { lockApi } from "../api/lockApi.js";
import { session } from "../utils/session.js";
import { appState } from "../state/appState.js";
import { toast } from "../utils/toast.js";
import { getLockDetails, getImageUrl } from "../utils/lockModelHelper.js";

export class DeviceTable {
  constructor(onLockSelected) {
    this.container = document.getElementById("device-table"); // Will now act as the grid container
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

    if (this.container) {
      this.container.addEventListener("click", (e) => this.handleSelection(e));
    }
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
    if (!this.container) return;
    this.container.innerHTML = "";

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

    // Switch container to CSS Grid instead of a block/table layout
    this.container.className =
      "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4";

    const cardsHtml = filteredLocks
      .map((lock) => {
        const lockAlias = lock.lockAlias || "Sem Nome";
        const { model, img } = getLockDetails(lock.lockName);
        const imageUrl = getImageUrl(img);

        const isOnline = lock.hasGateway === 1;
        // Using standard green for online, muted for offline
        const statusColor = isOnline
          ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
          : "bg-muted-foreground";
        const statusText = isOnline ? "Online" : "Offline";

        return `
        <div class="bg-card border border-border rounded-2xl shadow-sm hover:border-primary/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.1)] transition-all duration-300 overflow-hidden flex flex-col cursor-pointer select-btn group" data-id="${lock.lockId}" data-name="${lockAlias}">
          
          <!-- Image Header -->
          <div class="bg-muted/20 p-6 flex justify-center items-center h-48 relative transition-colors group-hover:bg-muted/40">
            <!-- Status Badge -->
            <div class="absolute top-3 right-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-md border border-border px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm text-foreground">
               <span class="w-2 h-2 rounded-full ${statusColor}"></span>
               ${statusText}
            </div>
            
            <img src="${imageUrl}" alt="${model}" class="max-h-full object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-105" />
          </div>

          <!-- Lock Info -->
          <div class="p-5 flex flex-col flex-grow border-t border-border">
            <h3 class="text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors" title="${lockAlias}">${lockAlias}</h3>
            <p class="text-sm text-muted-foreground font-medium mb-4">${model}</p>
            
            <div class="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
              <!-- Battery -->
              <div class="flex items-center gap-1.5 text-sm text-foreground font-mono">
                <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                ${lock.electricQuantity ? lock.electricQuantity + "%" : "--%"}
              </div>
              <!-- Lock Number / MAC -->
              <div class="text-xs text-muted-foreground font-mono truncate max-w-[120px]" title="${lock.lockName}">
                ${lock.lockName}
              </div>
            </div>
          </div>
          
        </div>
      `;
      })
      .join("");

    this.container.innerHTML = cardsHtml;
  }

  handleSelection(event) {
    const card = event.target.closest(".select-btn");

    if (card) {
      const id = card.getAttribute("data-id");
      const name = card.getAttribute("data-name");

      appState.setLock(id, name);

      if (this.onLockSelected) {
        this.onLockSelected(id, name);
      }
    }
  }
}

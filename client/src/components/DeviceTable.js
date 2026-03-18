import { apiClient } from '../api/apiClient.js';
import { session } from '../utils/session.js';
import { appState } from '../state/appState.js';
import { toast } from '../utils/toast.js';

export class DeviceTable {
    constructor(onLockSelected) {
        this.container = document.getElementById('device-table');
        this.tbody = document.getElementById('device-list-body');
        this.btnFetchLocks = document.getElementById('btn-fetch-locks');
        this.emptyText = document.getElementById('no-devices');
        
        this.tabOnline = document.getElementById('tab-online');
        this.tabOffline = document.getElementById('tab-offline');
        
        // Ensure the callback is stored!
        this.onLockSelected = onLockSelected;
        
        this.allLocks = [];
        this.currentTab = 'online';

        this.bindEvents();
    }

    bindEvents() {
        if (this.btnFetchLocks) this.btnFetchLocks.addEventListener('click', () => this.fetchLocks());
        
        if (this.tabOnline && this.tabOffline) {
            this.tabOnline.addEventListener('click', () => this.switchTab('online'));
            this.tabOffline.addEventListener('click', () => this.switchTab('offline'));
        }

        this.tbody.addEventListener('click', (e) => this.handleSelection(e));
    }

    enable() {
        if (this.btnFetchLocks) this.btnFetchLocks.disabled = false;
    }

    async fetchLocks() {
        const token = session.getToken();
        if (this.btnFetchLocks) this.btnFetchLocks.innerText = "Carregando...";
        
        try {
            const data = await apiClient.fetchLocks(token);
            this.allLocks = data.list || [];
            this.render();
            toast.info(`${this.allLocks.length} fechaduras carregadas.`);
        } catch (err) {
            toast.error("Falha ao tentar encontrar dispositivos.");
            console.error(err);
        } finally {
            if (this.btnFetchLocks) this.btnFetchLocks.innerText = "Encontrar Dispositivos";
        }
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        if (tabName === 'online') {
            this.tabOnline.className = "px-4 py-1.5 rounded-md text-sm font-semibold bg-background shadow-sm text-foreground transition-all cursor-pointer";
            this.tabOffline.className = "px-4 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer";
        } else {
            this.tabOffline.className = "px-4 py-1.5 rounded-md text-sm font-semibold bg-background shadow-sm text-foreground transition-all cursor-pointer";
            this.tabOnline.className = "px-4 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer";
        }
        
        this.render();
    }

    render() {
        this.tbody.innerHTML = ''; 
        
        if (this.allLocks.length === 0) {
            this.emptyText.innerText = "Não há fechaduras vinculadas a esta conta.";
            this.emptyText.style.display = 'block';
            this.container.style.display = 'none';
            return;
        }

        const filteredLocks = this.allLocks.filter(lock => {
            return this.currentTab === 'online' ? lock.hasGateway === 1 : lock.hasGateway === 0;
        });

        if (filteredLocks.length === 0) {
            const statusText = this.currentTab === 'online' ? 'online' : 'offline';
            this.emptyText.innerText = `Nenhuma fechadura ${statusText} encontrada.`;
            this.emptyText.style.display = 'block';
            this.container.style.display = 'none';
            return;
        }

        this.emptyText.style.display = 'none';
        this.container.style.display = 'table';
        
        filteredLocks.forEach(lock => {
            const tr = document.createElement('tr');
            const lockName = lock.lockAlias || 'Sem Nome';
            
            tr.className = "hover:bg-muted/50 transition-colors";
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap font-medium">${lockName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-muted-foreground">${lock.lockId}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                        ${lock.electricQuantity || 0}%
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <button class="select-btn bg-inverted text-inverted-foreground hover:bg-inverted/80 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors shadow-sm" data-id="${lock.lockId}" data-name="${lockName}">
                        Selecionar
                    </button>
                </td>
            `;
            this.tbody.appendChild(tr);
        });
    }

    handleSelection(event) {
        // FIXED: Use .closest() to guarantee we select the button element!
        const button = event.target.closest('.select-btn');
        
        if (button) {
            const id = button.getAttribute('data-id');
            const name = button.getAttribute('data-name');
            
            appState.setLock(id, name);
            
            // Trigger the navigation in main.js
            if (this.onLockSelected) {
                this.onLockSelected(id, name);
            }
        }
    }
}
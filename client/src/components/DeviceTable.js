import { apiClient } from '../api/apiClient.js';
import { session } from '../utils/session.js';
import { appState } from '../state/appState.js';
import { toast } from '../utils/toast.js';

export class DeviceTable {
    constructor(onLockSelected) {
        this.btnFetchLocks = document.getElementById('btn-fetch-locks');
        this.container = document.getElementById('device-table');
        this.tbody = document.getElementById('device-list-body');
        this.emptyText = document.getElementById('no-devices');
        this.onLockSelected = onLockSelected;
        this.bindEvents();
    }

    bindEvents() {
        this.btnFetchLocks.addEventListener('click', () => this.fetchLocks());
        this.tbody.addEventListener('click', (e) => this.handleSelection(e));
    }

    enable() {
        this.btnFetchLocks.disabled = false;
    }

    async fetchLocks() {
        const token = session.getToken();
        this.btnFetchLocks.innerText = "Carregando...";
        try {
            const data = await apiClient.fetchLocks(token);
            this.render(data.list);
        } catch (err) {
            toast.error("Falha ao tentar encontrar dispositivos.");
            console.error(err);
        } finally {
            this.btnFetchLocks.innerText = "Encontrar Dispositivos";
        }
    }

    render(locks) {
        this.tbody.innerHTML = ''; 
        if (!locks || locks.length === 0) {
            this.emptyText.innerText = "Não há fechaduras vinculadas a esta conta.";
            this.emptyText.style.display = 'block';
            this.container.style.display = 'none';
            return;
        }

        this.emptyText.style.display = 'none';
        this.container.style.display = 'table';
        
        locks.forEach(lock => {
            const tr = document.createElement('tr');
            const lockName = lock.lockAlias || 'Sem Nome';
            tr.innerHTML = `
                <td>${lockName}</td>
                <td>${lock.lockId}</td>
                <td>${lock.electricQuantity}%</td>
                <td>
                    <button class="select-btn action-btn" data-id="${lock.lockId}" data-name="${lockName}">
                        Selecionar
                    </button>
                </td>
            `;
            this.tbody.appendChild(tr);
        });
    }

    handleSelection(event) {
        if (event.target.classList.contains('select-btn')) {
            const button = event.target;
            const id = button.getAttribute('data-id');
            const name = button.getAttribute('data-name');
            
            appState.setLock(id, name);
            
            const allRows = this.tbody.querySelectorAll('tr');
            allRows.forEach(row => row.style.backgroundColor = ''); 
            button.closest('tr').style.backgroundColor = '#e6f2ff'; 
            
            this.onLockSelected();
        }
    }
}
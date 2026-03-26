import { passcodeApi } from '../api/passcodeApi.js';
import { session } from '../utils/session.js';
import { appState } from '../state/appState.js';
import { toast } from '../utils/toast.js';

const TYPE_INFO = {
    2: {
        label: 'Permanente',
        description: 'Senha aleatória válida indefinidamente. Pode ser usada qualquer número de vezes.',
        hasDates: false,
        isCustom: false
    },
    3: {
        label: 'Temporária',
        description: 'Senha aleatória válida dentro de um intervalo de datas. (Minutos serão zerados).',
        hasDates: true,
        isCustom: false
    },
    1: {
        label: 'Uso Único',
        description: 'Senha aleatória que expira após a primeira utilização.',
        hasDates: false,
        isCustom: false
    },
    4: {
        label: 'Apagar Senha',
        description: 'Código especial que apaga todas as senhas da fechadura quando digitado no teclado.',
        hasDates: false,
        isCustom: false
    },
    6: {
        label: 'Cíclica',
        description: 'Cria uma senha personalizada via Gateway. Repete-se nos dias e horários selecionados.',
        hasDates: true,
        isCustom: true // Routes to /v3/keyboardPwd/add instead of /get
    }
};

export class PasscodePanel {
    constructor() {
        this.selectedType = 2; 

        this.tabs = document.querySelectorAll('.passcode-tab');
        this.dateFields = document.getElementById('passcode-date-fields');
        this.cyclicFields = document.getElementById('passcode-cyclic-fields');
        this.customInputGroup = document.getElementById('passcode-custom-input-group');
        this.inputCustomPasscode = document.getElementById('input-custom-passcode');
        this.descText = document.getElementById('passcode-type-desc-text');
        this.startDateInput = document.getElementById('passcode-start-date');
        this.endDateInput = document.getElementById('passcode-end-date');
        this.startTimeInput = document.getElementById('passcode-start-time');
        this.endTimeInput = document.getElementById('passcode-end-time');
        this.btnGenerate = document.getElementById('btn-generate-passcode');
        this.btnGenerateText = document.getElementById('btn-generate-text');
        this.resultPanel = document.getElementById('passcode-result');
        this.resultValue = document.getElementById('passcode-result-value');
        this.resultValidity = document.getElementById('passcode-result-validity');
        this.errorPanel = document.getElementById('passcode-error');
        this.errorText = document.getElementById('passcode-error-text');
        this.lockNameEl = document.getElementById('passcode-lock-name');

        this.bindEvents();
        this.applyType(2); 
    }

    bindEvents() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const type = parseInt(tab.getAttribute('data-type'));
                this.applyType(type);
            });
        });

        if (this.btnGenerate) this.btnGenerate.addEventListener('click', () => this.generatePasscode());
    }

    syncLock() {
        if (this.lockNameEl && appState.selectedLockName) {
            this.lockNameEl.innerText = appState.selectedLockName;
        }
        this.resetResult();
    }

    applyType(type) {
        this.selectedType = type;

        this.tabs.forEach(tab => {
            const t = parseInt(tab.getAttribute('data-type'));
            if (t === type) {
                tab.className = 'passcode-tab active-tab px-4 py-2 rounded-lg text-sm font-semibold transition-all border bg-primary text-primary-foreground border-primary shadow-sm';
            } else {
                tab.className = 'passcode-tab px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted';
            }
        });

        const info = TYPE_INFO[type];
        if (this.descText) this.descText.innerText = info.description;

        // Toggle visibility based on requirements
        this.dateFields.style.display = info.hasDates ? 'flex' : 'none';
        this.cyclicFields.style.display = info.isCustom ? 'flex' : 'none';
        this.customInputGroup.style.display = info.isCustom ? 'flex' : 'none';
        this.btnGenerateText.innerText = info.isCustom ? 'Registrar Senha via Gateway' : 'Gerar Senha Aleatória';

        if (info.hasDates) {
            if (!this.startDateInput.value) this.startDateInput.value = this.formatDatetimeLocal(new Date());
            if (!this.endDateInput.value) {
                const future = new Date();
                future.setDate(future.getDate() + 30); 
                this.endDateInput.value = this.formatDatetimeLocal(future);
            }
        }

        this.resetResult();
    }

    resetResult() {
        if (this.resultPanel) this.resultPanel.classList.add('hidden');
        if (this.errorPanel) this.errorPanel.classList.add('hidden');
    }

    async generatePasscode() {
        if (!appState.selectedLockId) return toast.error('Nenhuma fechadura selecionada.');

        const info = TYPE_INFO[this.selectedType];
        let startDate = null; 
        let endDate = null;

        // Date Validation
        if (info.hasDates) {
            if (!this.startDateInput.value || !this.endDateInput.value) {
                return toast.error('Preencha as datas de início e término.');
            }
            const startObj = new Date(this.startDateInput.value);
            const endObj = new Date(this.endDateInput.value);

            if (!info.isCustom) {
                startObj.setMinutes(0, 0, 0); 
                endObj.setMinutes(0, 0, 0);
            }

            startDate = startObj.getTime();
            endDate = endObj.getTime();

            if (endDate <= startDate) return toast.error('A data de término deve ser posterior à data de início.');
        }

        this.btnGenerate.disabled = true;
        this.btnGenerateText.innerText = 'Processando...';
        this.resetResult();

        try {
            let data;
            
            // Route 1: Custom Cyclic via Gateway
            if (info.isCustom) {
                const customCode = this.inputCustomPasscode.value.trim();
                if (!customCode || customCode.length < 4 || customCode.length > 9) {
                    throw new Error("A senha deve ter entre 4 e 9 dígitos.");
                }

                const checkedDays = Array.from(document.querySelectorAll('.day-checkbox:checked')).map(cb => cb.value).join(',');
                if (!checkedDays) throw new Error("Selecione pelo menos um dia da semana.");

                const startTime = this.startTimeInput.value;
                const endTime = this.endTimeInput.value;

                data = await passcodeApi.addCustomPasscode({
                    accessToken: session.getToken(),
                    lockId: appState.selectedLockId,
                    passcode: customCode,
                    name: "Senha Cíclica",
                    startDate: startDate,
                    endDate: endDate,
                    isAllDay: 2,
                    weekDays: checkedDays,
                    startTime: startTime,
                    endTime: endTime
                });
            } 
            // Route 2: Random Offline Generation
            else {
                data = await passcodeApi.generateRandomPasscode(
                    session.getToken(),
                    appState.selectedLockId,
                    this.selectedType,
                    startDate,
                    endDate
                );
            }

            // FIX: Check for !data.errcode (undefined is success) or keyboardPwdId (custom success)
            if (!data.errcode || data.errcode === 0 || data.keyboardPwdId) {
                const code = data.keyboardPwd || this.inputCustomPasscode.value || '------';
                this.showResult(code, startDate, endDate, info);
                toast.success('Senha registrada com sucesso!');
                this.inputCustomPasscode.value = ''; 
            } else {
                this.showError(data.errmsg || 'Falha na operação.');
            }
        } catch (err) {
            this.showError(err.message || 'Falha de conexão com o servidor.');
        } finally {
            this.btnGenerate.disabled = false;
            this.btnGenerateText.innerText = info.isCustom ? 'Registrar Senha via Gateway' : 'Gerar Senha Aleatória';
        }
    }

    showResult(code, startDate, endDate, info) {
        this.resultValue.innerText = code;
        this.resultValidity.innerText = info.isCustom ? 'Senha enviada remotamente via Gateway' : 'Senha offline gerada com sucesso';
        this.resultPanel.classList.remove('hidden');
    }

    showError(message) {
        this.errorText.innerText = message;
        this.errorPanel.classList.remove('hidden');
    }

    formatDatetimeLocal(date) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
    }
}
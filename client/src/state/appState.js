export const appState = {
    username: '',
    password: '',
    selectedLockId: null,
    selectedLockName: null,

    setCredentials(username, password) {
        this.username = username;
        this.password = password;
    },

    setLock(id, name) {
        this.selectedLockId = id;
        this.selectedLockName = name;
    },

    clearLock() {
        this.selectedLockId = null;
        this.selectedLockName = null;
    },

    clear() {
        this.username = '';
        this.password = '';
        this.selectedLockId = null;
        this.selectedLockName = null;
    }
};
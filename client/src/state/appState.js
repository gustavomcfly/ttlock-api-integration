export const appState = {
    credentials: { username: '', password: '' }, 
    selectedLockId: null,
    selectedLockName: '',
    
    setCredentials(user, pass) {
        this.credentials.username = user;
        this.credentials.password = pass;
    },
    
    setLock(id, name) {
        this.selectedLockId = id;
        this.selectedLockName = name;
    },
    
    clear() {
        this.credentials = { username: '', password: '' };
        this.selectedLockId = null;
        this.selectedLockName = '';
    }
};
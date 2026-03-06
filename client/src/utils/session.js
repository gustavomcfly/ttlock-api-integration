export const session = {
    save(token) {
        sessionStorage.setItem('tt_token', token);
    },
    getToken() {
        return sessionStorage.getItem('tt_token');
    },
    clear() {
        sessionStorage.clear();
    },
    isAuthenticated() {
        return !!this.getToken();
    }
};
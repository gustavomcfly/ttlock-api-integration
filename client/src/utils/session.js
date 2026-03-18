export const session = {
    save(token) {
        localStorage.setItem('tt_token', token);
    },
    getToken() {
        return localStorage.getItem('tt_token');
    },
    clear() {
        localStorage.removeItem('tt_token');
    },
    isAuthenticated() {
        return !!this.getToken();
    }
};
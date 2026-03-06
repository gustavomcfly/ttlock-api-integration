const API_BASE_URL = 'http://localhost:3001/api';

export const apiClient = {
    async login(credentials) {
        const response = await fetch(`${API_BASE_URL}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        return response.json();
    },

    async fetchLocks(accessToken) {
        const response = await fetch(`${API_BASE_URL}/lock/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken })
        });
        return response.json();
    },

    // Method for remote unlocking a lock
    async remoteUnlock(accessToken, lockId) {
        const response = await fetch(`${API_BASE_URL}/lock/unlock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, lockId })
        });
        return response.json();
    }
};
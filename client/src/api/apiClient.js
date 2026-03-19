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

    async remoteUnlock(accessToken, lockId) {
        const response = await fetch(`${API_BASE_URL}/lock/unlock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, lockId })
        });
        return response.json();
    },
    
    async getLockDetails(accessToken, lockId) {
        const response = await fetch(`${API_BASE_URL}/lock/detail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, lockId })
        });
        return response.json();
    },

    async renameLock(accessToken, lockId, lockName) {
        const response = await fetch(`${API_BASE_URL}/lock/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, lockId, lockName })
        });
        return response.json();
    },

    async changeSuperPasscode(accessToken, lockId, password) {
        const response = await fetch(`${API_BASE_URL}/lock/super-passcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, lockId, password })
        });
        return response.json();
    },

    async configPassageMode(accessToken, lockId, passageModeData) {
        const response = await fetch(`${API_BASE_URL}/lock/passage-mode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, lockId, ...passageModeData })
        });
        return response.json();
    },

    async deleteLock(accessToken, lockId) {
        const response = await fetch(`${API_BASE_URL}/lock/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, lockId })
        });
        return response.json();
    }
};
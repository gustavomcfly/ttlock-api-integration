const API_BASE_URL = 'http://localhost:3001/api/passcode';

export const passcodeApi = {
    async generateRandomPasscode(accessToken, lockId, passcodeType, startDate, endDate) {
        const response = await fetch(`${API_BASE_URL}/generate-random`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, lockId, passcodeType, startDate, endDate })
        });
        return response.json();
    },

    async addCustomPasscode(payload) {
        const response = await fetch(`${API_BASE_URL}/add-custom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response.json();
    }
};
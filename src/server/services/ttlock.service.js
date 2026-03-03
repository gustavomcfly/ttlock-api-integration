import axios from 'axios';

const BASE_URL = 'https://api.sciener.com';

export const ttlockService = {
    async authenticate({ clientId, clientSecret, username, password }) {
        const params = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            username: username,
            password: password,
            grant_type: 'password'
        });
        const response = await axios.post(`${BASE_URL}/oauth2/token`, params.toString());
        return response.data;
    },

    async fetchLocks(clientId, accessToken) {
        const response = await axios.get(`${BASE_URL}/v3/lock/list`, {
            params: { clientId, accessToken, pageNo: 1, pageSize: 50, date: Date.now() }
        });
        return response.data;
    },

    // Remote Unlock Method
    async remoteUnlock(clientId, accessToken, lockId) {
        const params = new URLSearchParams({
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            date: Date.now()
        });
        
        const response = await axios.post(`${BASE_URL}/v3/lock/unlock`, params.toString());
        return response.data;
    }
};
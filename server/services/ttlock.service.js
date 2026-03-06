import axios from 'axios';

const BASE_URL = 'https://api.sciener.com';

export const ttlockService = {
    async authenticate({ username, password }) {
        const params = new URLSearchParams({
            client_id: process.env.TTLOCK_CLIENT_ID,
            client_secret: process.env.TTLOCK_CLIENT_SECRET,
            username: username,
            password: password,
            grant_type: 'password'
        });
        const response = await axios.post(`${BASE_URL}/oauth2/token`, params.toString());
        return response.data;
    },

    async fetchLocks(accessToken) {
        const response = await axios.get(`${BASE_URL}/v3/lock/list`, {
            params: { 
                clientId: process.env.TTLOCK_CLIENT_ID, 
                accessToken, 
                pageNo: 1, 
                pageSize: 50, 
                date: Date.now() 
            }
        });
        return response.data;
    },

    async remoteUnlock(accessToken, lockId) {
        const params = new URLSearchParams({
            clientId: process.env.TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockId,
            date: Date.now()
        });
        
        const response = await axios.post(`${BASE_URL}/v3/lock/unlock`, params.toString());
        return response.data;
    }
};
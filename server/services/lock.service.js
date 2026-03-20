import axios from 'axios';
import 'dotenv/config'; 

const BASE_URL = 'https://api.sciener.com';

export const lockService = {
    async fetchLocks(accessToken) {
        const response = await axios.get(`${BASE_URL}/v3/lock/list`, {
            params: { 
                clientId: process.env.TTLOCK_CLIENT_ID,      
                accessToken: accessToken, 
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
    },

    async getLockDetails(accessToken, lockId) {
        const response = await axios.get(`${BASE_URL}/v3/lock/detail`, {
            params: {
                clientId: process.env.TTLOCK_CLIENT_ID,
                accessToken: accessToken,
                lockId: lockId,
                date: Date.now()
            }
        });
        return response.data;
    },

    async renameLock(accessToken, lockId, lockName) {
        const params = new URLSearchParams({
            clientId: process.env.TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockId,
            lockAlias: lockName,
            date: Date.now()
        });
        const response = await axios.post(`${BASE_URL}/v3/lock/rename`, params.toString());
        return response.data;
    },

    async changeSuperPasscode(accessToken, lockId, password) {
        const params = new URLSearchParams({
            clientId: process.env.TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockId,
            password: password,
            changeType: 2, 
            date: Date.now()
        });
        const response = await axios.post(`${BASE_URL}/v3/lock/changeAdminKeyboardPwd`, params.toString());
        return response.data;
    },

    async configPassageMode(accessToken, lockId, passageMode, isAllDay) {
        const params = new URLSearchParams({
            clientId: process.env.TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockId,
            passageMode: passageMode, 
            isAllDay: isAllDay || 1,
            type: 2, 
            date: Date.now()
        });
        const response = await axios.post(`${BASE_URL}/v3/lock/configPassageMode`, params.toString());
        return response.data;
    },

    async deleteLock(accessToken, lockId) {
        const params = new URLSearchParams({
            clientId: process.env.TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockId,
            date: Date.now()
        });
        const response = await axios.post(`${BASE_URL}/v3/lock/delete`, params.toString());
        return response.data;
    }
};
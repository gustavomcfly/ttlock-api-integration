import axios from 'axios';
import 'dotenv/config'; 

const BASE_URL = 'https://api.sciener.com';

export const passcodeService = {
    async getRandomPasscode(accessToken, lockId, passcodeType, startDate, endDate) {
        const params = new URLSearchParams();
        
        params.append('clientId', process.env.TTLOCK_CLIENT_ID);
        params.append('accessToken', accessToken);
        params.append('lockId', lockId);
        params.append('keyboardPwdType', passcodeType); 
        params.append('date', Date.now());

        const safeStartDate = startDate || Date.now();
        const safeEndDate = endDate || 0;

        params.append('startDate', safeStartDate);
        params.append('endDate', safeEndDate);
        
        const response = await axios.post(`${BASE_URL}/v3/keyboardPwd/get`, params.toString());
        return response.data;
    },

    // Custom Gateway Passcodes (Required for Cyclic)
    async addCustomPasscode(accessToken, lockId, passcode, name, startDate, endDate, isAllDay, weekDays, startTime, endTime) {
        const params = new URLSearchParams({
            clientId: process.env.TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockId,
            keyboardPwd: passcode,
            keyboardPwdName: name || "Senha Customizada",
            startDate: startDate || Date.now(),
            endDate: endDate || 0,
            addType: 2, 
            date: Date.now()
        });

        if (isAllDay === 2) {
            params.append('isAllDay', 2);
            params.append('weekDays', weekDays); 
            params.append('startTime', startTime); 
            params.append('endTime', endTime); 
        } else {
            params.append('isAllDay', 1);
        }

        const response = await axios.post(`${BASE_URL}/v3/keyboardPwd/add`, params.toString());
        return response.data;
    }
};
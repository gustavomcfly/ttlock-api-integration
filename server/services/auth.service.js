import axios from 'axios';
import 'dotenv/config'; 

const BASE_URL = 'https://api.sciener.com';

export const authService = {
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
    }
};
import { Router } from 'express';
import { ttlockService } from '../services/ttlock.service.js';

const router = Router();

router.post('/auth/token', async (req, res) => {
    try {
        const data = await ttlockService.authenticate(req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { error: "Failed to authenticate with TTLock" });
    }
});

router.post('/lock/list', async (req, res) => {
    const { accessToken } = req.body; 
    try {
        const data = await ttlockService.fetchLocks(accessToken);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { error: "Failed to fetch lock list" });
    }
});

router.post('/lock/unlock', async (req, res) => {
    const { accessToken, lockId } = req.body; 
    try {
        const data = await ttlockService.remoteUnlock(accessToken, lockId);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { error: "Failed to execute remote unlock" });
    }
});

// NOVAS ROTAS PARA GERENCIAMENTO DA FECHADURA

router.post('/lock/detail', async (req, res) => {
    const { accessToken, lockId } = req.body;
    try {
        const response = await fetch(`https://api.ttlock.com/v3/lock/detail?clientId=${CLIENT_ID}&accessToken=${accessToken}&lockId=${lockId}&date=${Date.now()}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ errcode: -1, errmsg: "Erro no servidor ao buscar detalhes." });
    }
});

router.post('/lock/rename', async (req, res) => {
    const { accessToken, lockId, lockName } = req.body;
    try {
        const params = new URLSearchParams();
        params.append('clientId', CLIENT_ID);
        params.append('accessToken', accessToken);
        params.append('lockId', lockId);
        params.append('lockAlias', lockName);
        params.append('date', Date.now());

        const response = await fetch('https://api.ttlock.com/v3/lock/rename', {
            method: 'POST',
            body: params
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ errcode: -1, errmsg: "Erro no servidor ao renomear." });
    }
});

router.post('/lock/super-passcode', async (req, res) => {
    const { accessToken, lockId, password } = req.body;
    try {
        const params = new URLSearchParams();
        params.append('clientId', CLIENT_ID);
        params.append('accessToken', accessToken);
        params.append('lockId', lockId);
        params.append('password', password);
        params.append('date', Date.now());

        const response = await fetch('https://api.ttlock.com/v3/lock/updateAdminKeyboardPwd', {
            method: 'POST',
            body: params
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ errcode: -1, errmsg: "Erro no servidor ao alterar super senha." });
    }
});

router.post('/lock/passage-mode', async (req, res) => {
    const { accessToken, lockId, passageMode, isAllDay } = req.body;
    try {
        const params = new URLSearchParams();
        params.append('clientId', CLIENT_ID);
        params.append('accessToken', accessToken);
        params.append('lockId', lockId);
        params.append('passageMode', passageMode); // 1 (ativado) ou 2 (desativado)
        params.append('isAllDay', isAllDay); // 1 para o dia todo
        params.append('date', Date.now());

        const response = await fetch('https://api.ttlock.com/v3/lock/passageMode/config', {
            method: 'POST',
            body: params
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        
        res.status(500).json({ errcode: -1, errmsg: "Erro no servidor ao configurar modo passagem." });
    }
});

router.post('/lock/delete', async (req, res) => {
    const { accessToken, lockId } = req.body;
    try {
        const params = new URLSearchParams();
        params.append('clientId', CLIENT_ID);
        params.append('accessToken', accessToken);
        params.append('lockId', lockId);
        params.append('date', Date.now());

        const response = await fetch('https://api.ttlock.com/v3/lock/delete', {
            method: 'POST',
            body: params
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ errcode: -1, errmsg: "Erro no servidor ao excluir fechadura." });
    }
});

export default router;
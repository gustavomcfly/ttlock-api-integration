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
    try {
        const data = await ttlockService.fetchLocks(req.body.accessToken);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { error: "Failed to fetch lock list" });
    }
});

router.post('/lock/unlock', async (req, res) => {
    try {
        const data = await ttlockService.remoteUnlock(req.body.accessToken, req.body.lockId);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { error: "Failed to execute remote unlock" });
    }
});

router.post('/lock/detail', async (req, res) => {
    try {
        const data = await ttlockService.getLockDetails(req.body.accessToken, req.body.lockId);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { errcode: -1, errmsg: "Erro ao buscar detalhes" });
    }
});

router.post('/lock/rename', async (req, res) => {
    try {
        const data = await ttlockService.renameLock(req.body.accessToken, req.body.lockId, req.body.lockName);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { errcode: -1, errmsg: "Erro ao renomear fechadura" });
    }
});

router.post('/lock/super-passcode', async (req, res) => {
    try {
        const data = await ttlockService.changeSuperPasscode(req.body.accessToken, req.body.lockId, req.body.password);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { errcode: -1, errmsg: "Erro ao alterar super senha" });
    }
});

router.post('/lock/passage-mode', async (req, res) => {
    try {
        const data = await ttlockService.configPassageMode(
            req.body.accessToken, 
            req.body.lockId, 
            req.body.passageMode, 
            req.body.isAllDay
        );
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { errcode: -1, errmsg: "Erro ao configurar modo passagem" });
    }
});

router.post('/lock/delete', async (req, res) => {
    try {
        const data = await ttlockService.deleteLock(req.body.accessToken, req.body.lockId);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { errcode: -1, errmsg: "Erro ao excluir fechadura" });
    }
});

export default router;
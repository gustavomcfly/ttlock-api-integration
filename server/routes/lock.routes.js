import { Router } from 'express';
import { lockService } from '../services/lock.service.js';

const router = Router();

router.post('/list', async (req, res) => {
    try {
        const data = await lockService.fetchLocks(req.body.accessToken);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { error: "Failed to fetch locks" });
    }
});

router.post('/unlock', async (req, res) => {
    try {
        const data = await lockService.remoteUnlock(req.body.accessToken, req.body.lockId);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { error: "Failed to unlock" });
    }
});

router.post('/detail', async (req, res) => {
    try {
        const data = await lockService.getLockDetails(req.body.accessToken, req.body.lockId);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { errcode: -1, errmsg: "Erro ao buscar detalhes" });
    }
});

router.post('/rename', async (req, res) => {
    try {
        const data = await lockService.renameLock(req.body.accessToken, req.body.lockId, req.body.lockName);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { errcode: -1, errmsg: "Erro ao renomear" });
    }
});

router.post('/super-passcode', async (req, res) => {
    try {
        const data = await lockService.changeSuperPasscode(req.body.accessToken, req.body.lockId, req.body.password);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { errcode: -1, errmsg: "Erro ao alterar senha" });
    }
});

router.post('/passage-mode', async (req, res) => {
    try {
        const data = await lockService.configPassageMode(req.body.accessToken, req.body.lockId, req.body.passageMode, req.body.isAllDay);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { errcode: -1, errmsg: "Erro no modo passagem" });
    }
});

router.post('/delete', async (req, res) => {
    try {
        const data = await lockService.deleteLock(req.body.accessToken, req.body.lockId);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { errcode: -1, errmsg: "Erro ao excluir" });
    }
});

export default router;
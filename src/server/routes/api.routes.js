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
    const { clientId, accessToken } = req.body;
    try {
        const data = await ttlockService.fetchLocks(clientId, accessToken);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { error: "Failed to fetch lock list" });
    }
});

// Remote Unlock Route
router.post('/lock/unlock', async (req, res) => {
    const { clientId, accessToken, lockId } = req.body;
    try {
        const data = await ttlockService.remoteUnlock(clientId, accessToken, lockId);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { error: "Failed to execute remote unlock" });
    }
});

export default router;
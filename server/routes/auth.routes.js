import { Router } from 'express';
import { authService } from '../services/auth.service.js';

const router = Router();

router.post('/token', async (req, res) => {
    try {
        const data = await authService.authenticate(req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { error: "Failed to authenticate" });
    }
});

export default router;
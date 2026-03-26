import { Router } from 'express';
import { passcodeService } from '../services/passcode.service.js';

const router = Router();

router.post('/generate-random', async (req, res) => {
    const { accessToken, lockId, passcodeType, startDate, endDate } = req.body;
    try {
        const data = await passcodeService.getRandomPasscode(accessToken, lockId, passcodeType, startDate, endDate);
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { errcode: -1, errmsg: "Failed to generate random passcode" });
    }
});

router.post('/add-custom', async (req, res) => {
    const { accessToken, lockId, passcode, name, startDate, endDate, isAllDay, weekDays, startTime, endTime } = req.body;
    try {
        const data = await passcodeService.addCustomPasscode(
            accessToken, lockId, passcode, name, startDate, endDate, isAllDay, weekDays, startTime, endTime
        );
        res.json(data);
    } catch (error) {
        res.status(500).json(error.response?.data || { errcode: -1, errmsg: "Failed to add custom passcode via Gateway" });
    }
});

export default router;
import { Router } from "express";
import { fingerprintService } from "../services/fingerprint.service.js";

const router = Router();

router.post("/add", async (req, res) => {
  const { accessToken, lockId, fingerprintNumber, name, startDate, endDate } =
    req.body;
  try {
    const data = await fingerprintService.addFingerprint(
      accessToken,
      lockId,
      fingerprintNumber,
      name,
      startDate,
      endDate,
    );
    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json(
        error.response?.data || {
          errcode: -1,
          errmsg: "Failed to add fingerprint",
        },
      );
  }
});

router.post("/list", async (req, res) => {
  const { accessToken, lockId, pageNo, pageSize } = req.body;
  try {
    const data = await fingerprintService.getFingerprintList(
      accessToken,
      lockId,
      pageNo,
      pageSize,
    );
    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json(
        error.response?.data || {
          errcode: -1,
          errmsg: "Failed to get fingerprints",
        },
      );
  }
});

router.post("/delete", async (req, res) => {
  const { accessToken, lockId, fingerprintId } = req.body;
  try {
    const data = await fingerprintService.deleteFingerprint(
      accessToken,
      lockId,
      fingerprintId,
    );
    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json(
        error.response?.data || {
          errcode: -1,
          errmsg: "Failed to delete fingerprint",
        },
      );
  }
});

router.post("/clear", async (req, res) => {
  const { accessToken, lockId } = req.body;
  try {
    const data = await fingerprintService.clearFingerprints(
      accessToken,
      lockId,
    );
    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json(
        error.response?.data || {
          errcode: -1,
          errmsg: "Failed to clear fingerprints",
        },
      );
  }
});

router.post("/change-period", async (req, res) => {
  const { accessToken, lockId, fingerprintId, startDate, endDate } = req.body;
  try {
    const data = await fingerprintService.changeFingerprintPeriod(
      accessToken,
      lockId,
      fingerprintId,
      startDate,
      endDate,
    );
    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json(
        error.response?.data || {
          errcode: -1,
          errmsg: "Failed to change fingerprint period",
        },
      );
  }
});

export default router;

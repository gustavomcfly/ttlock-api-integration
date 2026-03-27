import { Router } from "express";
import { rfidService } from "../services/rfid.service.js";

const router = Router();

router.post("/add", async (req, res) => {
  const { accessToken, lockId, cardNumber, name, startDate, endDate } =
    req.body;
  try {
    const data = await rfidService.addCard(
      accessToken,
      lockId,
      cardNumber,
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
          errmsg: "Failed to add RFID card",
        },
      );
  }
});

router.post("/list", async (req, res) => {
  const { accessToken, lockId, pageNo, pageSize } = req.body;
  try {
    const data = await rfidService.getCardList(
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
          errmsg: "Failed to get RFID cards",
        },
      );
  }
});

router.post("/delete", async (req, res) => {
  const { accessToken, lockId, cardId } = req.body;
  try {
    const data = await rfidService.deleteCard(accessToken, lockId, cardId);
    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json(
        error.response?.data || {
          errcode: -1,
          errmsg: "Failed to delete RFID card",
        },
      );
  }
});

router.post("/clear", async (req, res) => {
  const { accessToken, lockId } = req.body;
  try {
    const data = await rfidService.clearCards(accessToken, lockId);
    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json(
        error.response?.data || {
          errcode: -1,
          errmsg: "Failed to clear RFID cards",
        },
      );
  }
});

router.post("/change-period", async (req, res) => {
  const { accessToken, lockId, cardId, startDate, endDate } = req.body;
  try {
    const data = await rfidService.changePeriod(
      accessToken,
      lockId,
      cardId,
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
          errmsg: "Failed to change RFID card period",
        },
      );
  }
});

export default router;

import { Router } from "express";
import prisma from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const DEFAULTS = {
  testerName: "",
  stdPasscode: "",
  stdCard: "",
  stdFingerprint: "",
  defaultCycles: 100,
  defaultUnlockTime: 5,
  defaultInterval: 5,
};

const text = (v, max = 100) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const int = (v, fallback, min, max) => {
  const n = parseInt(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

function toClient(row) {
  if (!row) return { ...DEFAULTS };
  return {
    testerName: row.testerName ?? "",
    stdPasscode: row.stdPasscode ?? "",
    stdCard: row.stdCard ?? "",
    stdFingerprint: row.stdFingerprint ?? "",
    defaultCycles: row.defaultCycles,
    defaultUnlockTime: row.defaultUnlockTime,
    defaultInterval: row.defaultInterval,
  };
}

router.get("/", async (req, res) => {
  try {
    const row = await prisma.userSettings.findUnique({
      where: { userId: req.user.id },
    });
    res.json({ success: true, settings: toClient(row) });
  } catch (err) {
    console.error("[Settings] Erro ao buscar:", err);
    res.status(500).json({ success: false, message: "Erro ao buscar configurações." });
  }
});

router.put("/", async (req, res) => {
  try {
    const b = req.body || {};
    const data = {
      testerName: text(b.testerName) || null,
      stdPasscode: text(b.stdPasscode) || null,
      stdCard: text(b.stdCard) || null,
      stdFingerprint: text(b.stdFingerprint) || null,
      defaultCycles: int(b.defaultCycles, DEFAULTS.defaultCycles, 1, 1_000_000),
      defaultUnlockTime: int(b.defaultUnlockTime, DEFAULTS.defaultUnlockTime, 1, 3600),
      defaultInterval: int(b.defaultInterval, DEFAULTS.defaultInterval, 1, 3600),
    };

    const row = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: data,
      create: { userId: req.user.id, ...data },
    });
    res.json({ success: true, settings: toClient(row) });
  } catch (err) {
    console.error("[Settings] Erro ao salvar:", err);
    res.status(500).json({ success: false, message: "Erro ao salvar configurações." });
  }
});

export default router;

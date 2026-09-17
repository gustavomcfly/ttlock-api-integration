import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import lockRoutes from "./routes/lock.routes.js";
import passcodeRoutes from "./routes/passcode.routes.js";
import rfidRoutes from "./routes/rfid.routes.js";
import fingerprintRoutes from "./routes/fingerprint.routes.js";
import recordRoutes from "./routes/record.routes.js";
import qualityRoutes from "./routes/quality.routes.js";
import reportRoutes from "./routes/report.routes.js";
import cyclicTestsDbRoutes from "./db-routes/cyclicTestsDB.js";
import prisma from "./prismaClient.js";

const app = express();
app.use(cors());
app.use(express.json());

// 1. Group all your standard API routes
const apiRouter = express.Router();
apiRouter.use("/auth", authRoutes);
apiRouter.use("/lock", lockRoutes);
apiRouter.use("/passcode", passcodeRoutes);
apiRouter.use("/rfid", rfidRoutes);
apiRouter.use("/fingerprint", fingerprintRoutes);
apiRouter.use("/record", recordRoutes);
apiRouter.use("/quality", qualityRoutes);
apiRouter.use("/reports", reportRoutes);

// 2. Mount API routes for both Local Dev and Netlify Serverless
app.use("/api", apiRouter);
app.use("/.netlify/functions/api", apiRouter);

// 3. Mount the DB routes for both Local Dev and Netlify Serverless
app.use("/db/cyclic-tests", cyclicTestsDbRoutes);
app.use("/.netlify/functions/api/db/cyclic-tests", cyclicTestsDbRoutes);

// Só executa localmente — nunca quando importado pela Netlify Function
if (process.env.NODE_ENV !== "production") {
  async function reconcileOrphanedTests() {
    const orphaned = await prisma.cyclicTest.findMany({
      where: { status: { in: ["running", "paused"] } },
    });

    for (const test of orphaned) {
      await prisma.cyclicTest.update({
        where: { id: test.id },
        data: { status: "stopped", completedAt: new Date() },
      });
      await prisma.cyclicTestLog.create({
        data: {
          testId: test.id,
          type: "SYSTEM",
          level: "warning",
          message: "Servidor reiniciado; teste marcado como interrompido.",
        },
      });
    }

    if (orphaned.length > 0) {
      console.log(
        `⚠️  ${orphaned.length} teste(s) órfão(s) marcado(s) como interrompido(s) na inicialização.`,
      );
    }
  }

  const PORT = process.env.PORT || 3001;
  reconcileOrphanedTests()
    .catch((err) =>
      console.error("[Startup] Erro ao reconciliar testes órfãos:", err),
    )
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
      });
    });
}

export default app;

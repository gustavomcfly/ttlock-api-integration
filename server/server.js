import "dotenv/config";
import express from "express";
import cors from "cors";

// Import modular routes
import authRoutes from "./routes/auth.routes.js";
import lockRoutes from "./routes/lock.routes.js";
import passcodeRoutes from "./routes/passcode.routes.js";
import rfidRoutes from "./routes/rfid.routes.js";
import fingerprintRoutes from "./routes/fingerprint.routes.js";
import recordRoutes from "./routes/record.routes.js";
import qualityRoutes from "./routes/quality.routes.js";
import cyclicTestsDbRoutes from "./db-routes/cyclicTestsDB.js";
import prisma from "./prismaClient.js";

const app = express();
app.use(cors());
app.use(express.json());

// Register base routes
app.use("/api/auth", authRoutes);
app.use("/api/lock", lockRoutes);
app.use("/api/passcode", passcodeRoutes);
app.use("/api/rfid", rfidRoutes);
app.use("/api/fingerprint", fingerprintRoutes);
app.use("/api/record", recordRoutes);
app.use("/api/quality", qualityRoutes);
app.use("/db/cyclic-tests", cyclicTestsDbRoutes);

const PORT = process.env.PORT || 3001;

// O motor de ciclagem vive em memória dentro do processo Node. Se o servidor for
// reiniciado (deploy, crash, etc.), qualquer teste "running"/"paused" no banco não tem
// mais um loop real por trás dele. Em vez de deixar a UI mostrar um teste "ativo" fantasma,
// marcamos esses registros como "stopped" logo na inicialização.
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

reconcileOrphanedTests()
  .catch((err) =>
    console.error("[Startup] Erro ao reconciliar testes órfãos:", err),
  )
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  });

export default app;

-- ======================================================================
-- 1) UserSettings: configurações por usuário (antes: localStorage)
--    A tabela "Settings" (singleton global) nunca foi lida/escrita pelo
--    código, então é descartada.
-- ======================================================================
CREATE TABLE "UserSettings" (
    "userId"            TEXT NOT NULL,
    "testerName"        TEXT,
    "stdPasscode"       TEXT,
    "stdCard"           TEXT,
    "stdFingerprint"    TEXT,
    "defaultCycles"     INTEGER NOT NULL DEFAULT 100,
    "defaultUnlockTime" INTEGER NOT NULL DEFAULT 5,
    "defaultInterval"   INTEGER NOT NULL DEFAULT 5,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserSettings"
  ADD CONSTRAINT "UserSettings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "Settings";

-- ======================================================================
-- 2) Auditoria de Qualidade: passa a ser persistida (antes: Map em memória)
-- ======================================================================
ALTER TABLE "QualityAudit"
  ADD COLUMN "testerName" TEXT,
  ADD COLUMN "params" JSONB;

ALTER TABLE "QualityAuditStep" RENAME COLUMN "details" TO "errorMsg";

ALTER TABLE "QualityAuditStep"
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "stepKey"  TEXT    NOT NULL DEFAULT '',
  ADD COLUMN "logs"     JSONB   NOT NULL DEFAULT '[]';

ALTER TABLE "QualityAuditStep"
  ALTER COLUMN "position" DROP DEFAULT,
  ALTER COLUMN "stepKey"  DROP DEFAULT;

-- Apagar o usuário não deve apagar o histórico: o dono vira NULL.
ALTER TABLE "CyclicTest"   DROP CONSTRAINT "CyclicTest_userId_fkey";
ALTER TABLE "CyclicTest"
  ADD CONSTRAINT "CyclicTest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ======================================================================
-- 3) Report: vínculo com usuário, fechadura e teste de origem
-- ======================================================================
ALTER TABLE "Report"
  ADD COLUMN "userId"         TEXT,
  ADD COLUMN "cyclicTestId"   TEXT,
  ADD COLUMN "qualityAuditId" TEXT;

-- Relatórios antigos podem apontar para fechaduras que não existem em "Lock"
-- (testes de qualidade nunca gravavam a fechadura). Cria as que faltam
-- antes de ligar a chave estrangeira.
INSERT INTO "Lock" ("lockId", "lockAlias")
SELECT DISTINCT ON (r."lockId") r."lockId", r."lockAlias"
FROM "Report" r
WHERE NOT EXISTS (SELECT 1 FROM "Lock" l WHERE l."lockId" = r."lockId")
ORDER BY r."lockId", r."createdAt" DESC;

-- Backfill: relatórios de ciclagem guardavam o id do teste dentro do payload.
UPDATE "Report" r
SET "userId" = ct."userId"
FROM "CyclicTest" ct
WHERE r."type" = 'cyclic' AND r."payload"->>'testId' = ct."id";

-- Se o mesmo teste foi salvo mais de uma vez, só o relatório mais recente
-- recebe o vínculo (a coluna é UNIQUE).
UPDATE "Report" r
SET "cyclicTestId" = r."payload"->>'testId'
FROM (
  SELECT DISTINCT ON (r2."payload"->>'testId') r2."id"
  FROM "Report" r2
  WHERE r2."type" = 'cyclic'
    AND EXISTS (SELECT 1 FROM "CyclicTest" ct WHERE ct."id" = r2."payload"->>'testId')
  ORDER BY r2."payload"->>'testId', r2."createdAt" DESC
) latest
WHERE r."id" = latest."id";

-- Relatórios de qualidade antigos vieram de um teste em memória (id "Q-123456"):
-- não existe linha de origem nem como descobrir o dono, então ficam com userId NULL.

-- ======================================================================
-- 4) Índices e chaves estrangeiras
-- ======================================================================
CREATE UNIQUE INDEX "Report_cyclicTestId_key"   ON "Report"("cyclicTestId");
CREATE UNIQUE INDEX "Report_qualityAuditId_key" ON "Report"("qualityAuditId");
CREATE INDEX "Report_userId_createdAt_idx" ON "Report"("userId", "createdAt");
CREATE INDEX "Report_lockId_idx"           ON "Report"("lockId");

CREATE INDEX "CyclicTest_userId_idx" ON "CyclicTest"("userId");
CREATE INDEX "CyclicTest_lockId_idx" ON "CyclicTest"("lockId");
CREATE INDEX "CyclicTest_status_idx" ON "CyclicTest"("status");
CREATE INDEX "CyclicTestLog_testId_idx" ON "CyclicTestLog"("testId");

CREATE INDEX "QualityAudit_userId_idx" ON "QualityAudit"("userId");
CREATE INDEX "QualityAudit_lockId_idx" ON "QualityAudit"("lockId");
CREATE INDEX "QualityAuditStep_auditId_idx" ON "QualityAuditStep"("auditId");

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_lockId_fkey"
  FOREIGN KEY ("lockId") REFERENCES "Lock"("lockId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_cyclicTestId_fkey"
  FOREIGN KEY ("cyclicTestId") REFERENCES "CyclicTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_qualityAuditId_fkey"
  FOREIGN KEY ("qualityAuditId") REFERENCES "QualityAudit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

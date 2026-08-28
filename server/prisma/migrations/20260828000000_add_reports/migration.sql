-- CreateTable
CREATE TABLE "Report" (
    "id"          TEXT        NOT NULL,
    "type"        TEXT        NOT NULL,          -- "cyclic" | "quality"
    "title"       TEXT        NOT NULL,
    "lockId"      INTEGER     NOT NULL,
    "lockAlias"   TEXT        NOT NULL,
    "status"      TEXT        NOT NULL,          -- status final do teste
    "testerName"  TEXT,
    "startedAt"   TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload"     JSONB       NOT NULL,          -- snapshot completo do teste

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

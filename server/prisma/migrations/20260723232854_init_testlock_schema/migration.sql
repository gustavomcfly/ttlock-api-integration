-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lock" (
    "lockId" INTEGER NOT NULL,
    "lockAlias" TEXT NOT NULL,
    "lockMac" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lock_pkey" PRIMARY KEY ("lockId")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "defaultDelay" INTEGER NOT NULL DEFAULT 5,
    "maxFailures" INTEGER NOT NULL DEFAULT 3,
    "lowBatteryAlert" INTEGER NOT NULL DEFAULT 20,
    "testerName" TEXT,
    "strictValidation" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CyclicTest" (
    "id" TEXT NOT NULL,
    "lockId" INTEGER NOT NULL,
    "userId" TEXT,
    "totalCycles" INTEGER NOT NULL,
    "completedCycles" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delayBetweenCycles" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL,
    "totalFailures" INTEGER NOT NULL DEFAULT 0,
    "batteryStart" INTEGER,
    "batteryEnd" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CyclicTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CyclicTestLog" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CyclicTestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityAudit" (
    "id" TEXT NOT NULL,
    "lockId" INTEGER NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QualityAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityAuditStep" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityAuditStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "CyclicTest" ADD CONSTRAINT "CyclicTest_lockId_fkey" FOREIGN KEY ("lockId") REFERENCES "Lock"("lockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CyclicTest" ADD CONSTRAINT "CyclicTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CyclicTestLog" ADD CONSTRAINT "CyclicTestLog_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CyclicTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityAudit" ADD CONSTRAINT "QualityAudit_lockId_fkey" FOREIGN KEY ("lockId") REFERENCES "Lock"("lockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityAudit" ADD CONSTRAINT "QualityAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityAuditStep" ADD CONSTRAINT "QualityAuditStep_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "QualityAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

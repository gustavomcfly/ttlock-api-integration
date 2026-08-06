-- AlterTable
ALTER TABLE "CyclicTest" ADD COLUMN     "battery" INTEGER,
ADD COLUMN     "lowBatteryThreshold" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "maxConsecutiveFailures" INTEGER NOT NULL DEFAULT 3;

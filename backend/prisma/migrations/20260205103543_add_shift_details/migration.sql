-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('WORK', 'VACATION', 'OFF', 'MEDICAL');

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "isOvertime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" "ShiftType" NOT NULL DEFAULT 'WORK';

/*
  Warnings:

  - Added the required column `feesCollected0After` to the `position_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `feesCollected0Before` to the `position_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `feesCollected1After` to the `position_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `feesCollected1Before` to the `position_events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."position_events" ADD COLUMN     "feeValueInQuote" TEXT,
ADD COLUMN     "feesCollected0After" TEXT NOT NULL,
ADD COLUMN     "feesCollected0Before" TEXT NOT NULL,
ADD COLUMN     "feesCollected1After" TEXT NOT NULL,
ADD COLUMN     "feesCollected1Before" TEXT NOT NULL,
ADD COLUMN     "valueInQuote" TEXT;

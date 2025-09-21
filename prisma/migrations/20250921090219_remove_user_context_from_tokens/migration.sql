/*
  Warnings:

  - You are about to drop the column `notes` on the `tokens` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `tokens` table. All the data in the column will be lost.
  - You are about to drop the column `userLabel` on the `tokens` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."tokens" DROP CONSTRAINT "tokens_userId_fkey";

-- DropIndex
DROP INDEX "public"."tokens_userId_chain_idx";

-- AlterTable
ALTER TABLE "public"."tokens" DROP COLUMN "notes",
DROP COLUMN "userId",
DROP COLUMN "userLabel";

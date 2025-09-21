/*
  Warnings:

  - You are about to drop the column `addedAt` on the `tokens` table. All the data in the column will be lost.
  - You are about to drop the column `lastUpdatedAt` on the `tokens` table. All the data in the column will be lost.
  - You are about to drop the column `lastUsedAt` on the `tokens` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."tokens" DROP COLUMN "addedAt",
DROP COLUMN "lastUpdatedAt",
DROP COLUMN "lastUsedAt";

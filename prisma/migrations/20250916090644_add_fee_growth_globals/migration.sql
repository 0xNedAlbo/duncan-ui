-- AlterTable
ALTER TABLE "public"."pools" ADD COLUMN     "feeGrowthGlobal0X128" TEXT NOT NULL DEFAULT '0',
ADD COLUMN     "feeGrowthGlobal1X128" TEXT NOT NULL DEFAULT '0';

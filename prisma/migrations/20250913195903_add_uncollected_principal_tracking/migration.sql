-- AlterTable
ALTER TABLE "public"."position_events" ADD COLUMN     "uncollectedPrincipal0" TEXT NOT NULL DEFAULT '0',
ADD COLUMN     "uncollectedPrincipal1" TEXT NOT NULL DEFAULT '0';

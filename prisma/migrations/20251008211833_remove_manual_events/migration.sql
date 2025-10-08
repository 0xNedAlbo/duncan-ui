-- Remove manual event support
-- This migration removes the ledgerIgnore and source fields as all events are now onchain-only

-- Delete any existing manual events (if any)
DELETE FROM "position_events" WHERE "source" = 'manual';

-- Drop ledgerIgnore column
ALTER TABLE "position_events" DROP COLUMN "ledgerIgnore";

-- Drop source column
ALTER TABLE "position_events" DROP COLUMN "source";

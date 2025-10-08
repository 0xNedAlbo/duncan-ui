-- Migration: remove_blockscanner_header
-- Drop the blockscanner_headers table (not needed for diff-based reorg detection)

DROP TABLE IF EXISTS "blockscanner_headers";

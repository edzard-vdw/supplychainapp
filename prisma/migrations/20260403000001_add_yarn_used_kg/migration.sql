-- Add yarn usage tracking fields to production_runs
ALTER TABLE `production_runs`
  ADD COLUMN `yarn_used_kg` FLOAT NULL,
  ADD COLUMN `yarn_stock_deducted` BOOLEAN NOT NULL DEFAULT false;

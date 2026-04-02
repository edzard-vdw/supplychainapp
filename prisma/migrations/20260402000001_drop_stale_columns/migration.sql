-- Drop stale columns removed from schema:
-- finishing_process was replaced by stitch_type
-- expected_completion was renamed to expected_ex_factory
ALTER TABLE `production_runs`
    DROP COLUMN `finishing_process`,
    DROP COLUMN `expected_completion`;

-- Add language field to suppliers table
ALTER TABLE `suppliers` ADD COLUMN `language` VARCHAR(10) NOT NULL DEFAULT 'en';

-- Add language preference to users table
-- Supported values: "en" (English), "ro" (Romanian), "bg" (Bulgarian), "pt" (Portuguese)
ALTER TABLE `users` ADD COLUMN `language` VARCHAR(10) NOT NULL DEFAULT 'en';

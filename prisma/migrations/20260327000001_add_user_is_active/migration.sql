-- AlterTable: add is_active column to users, then back-fill existing rows to true
ALTER TABLE `users` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;
UPDATE `users` SET `is_active` = true WHERE `is_active` = false;

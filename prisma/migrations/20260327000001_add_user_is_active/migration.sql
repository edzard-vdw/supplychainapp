-- AlterTable: add is_active column to users (default true for existing users)
ALTER TABLE `users` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

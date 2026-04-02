-- Catch-up migration: brings a fresh DB (from init migration) fully up to
-- date with the current schema. All statements here were previously applied
-- to the live DB directly via ALTER TABLE / CREATE TABLE SQL.

-- ─── AlterTable: orders ────────────────────────────────────────────────────
ALTER TABLE `orders`
    ADD COLUMN `season` VARCHAR(191) NULL,
    ADD COLUMN `supplier_id` INTEGER NULL,
    ADD COLUMN `tags` VARCHAR(191) NULL,
    MODIFY `status` ENUM('DRAFT', 'CONFIRMED', 'ACKNOWLEDGED', 'IN_PRODUCTION', 'QC', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT';

-- ─── AlterTable: production_runs ──────────────────────────────────────────
ALTER TABLE `production_runs`
    ADD COLUMN `batch_nfc_tag` VARCHAR(191) NULL,
    ADD COLUMN `batch_qr_code` VARCHAR(191) NULL,
    ADD COLUMN `expected_ex_factory` DATETIME(3) NULL,
    ADD COLUMN `finished_date` DATETIME(3) NULL,
    ADD COLUMN `finisher_name` VARCHAR(191) NULL,
    ADD COLUMN `individual_tagging` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `order_id` INTEGER NULL,
    ADD COLUMN `product_color` VARCHAR(191) NULL,
    ADD COLUMN `product_name` VARCHAR(191) NULL,
    ADD COLUMN `product_size` VARCHAR(191) NULL,
    ADD COLUMN `sku` VARCHAR(191) NULL,
    ADD COLUMN `stitch_type` VARCHAR(191) NULL,
    ADD COLUMN `supplier_id` INTEGER NULL,
    ADD COLUMN `yarn_colour_code` VARCHAR(191) NULL,
    ADD COLUMN `yarn_delivery_ref` VARCHAR(191) NULL,
    ADD COLUMN `yarn_lot_number` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PLANNED', 'IN_PRODUCTION', 'QC', 'SHIPPED', 'RECEIVED', 'COMPLETED') NOT NULL DEFAULT 'PLANNED';

-- ─── AlterTable: users ────────────────────────────────────────────────────
ALTER TABLE `users`
    ADD COLUMN `supplier_id` INTEGER NULL,
    MODIFY `role` ENUM('ADMIN', 'SUPPLIER', 'VIEWER') NOT NULL DEFAULT 'SUPPLIER';

-- ─── AlterTable: yarn_compositions ───────────────────────────────────────
ALTER TABLE `yarn_compositions`
    ADD COLUMN `lot_number` VARCHAR(191) NULL,
    ADD COLUMN `supplier_ref` VARCHAR(191) NULL,
    ADD COLUMN `yarn_order_code` VARCHAR(191) NULL;

-- ─── CreateTable: suppliers ───────────────────────────────────────────────
CREATE TABLE `suppliers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('GROWER', 'SCOURER', 'SPINNER', 'KNITTER', 'FINISHER', 'RETAILER', 'OTHER') NOT NULL DEFAULT 'KNITTER',
    `country` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `contact_name` VARCHAR(191) NULL,
    `contact_email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `external_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `suppliers_name_key`(`name`),
    UNIQUE INDEX `suppliers_external_id_key`(`external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── CreateTable: facility_profiles ──────────────────────────────────────
CREATE TABLE `facility_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplier_id` INTEGER NOT NULL,
    `energy_source` VARCHAR(191) NULL,
    `renewable_pct` DOUBLE NULL,
    `annual_energy_kwh` DOUBLE NULL,
    `water_source` VARCHAR(191) NULL,
    `annual_water_litres` DOUBLE NULL,
    `water_recycling_pct` DOUBLE NULL,
    `waste_management` VARCHAR(191) NULL,
    `annual_waste_kg` DOUBLE NULL,
    `facility_size_sqm` DOUBLE NULL,
    `employee_count` INTEGER NULL,
    `operating_hours` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `facility_profiles_supplier_id_key`(`supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── CreateTable: supplier_certifications ─────────────────────────────────
CREATE TABLE `supplier_certifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplier_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `cert_number` VARCHAR(191) NULL,
    `issued_by` VARCHAR(191) NULL,
    `valid_from` DATETIME(3) NULL,
    `valid_until` DATETIME(3) NULL,
    `document_url` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `supplier_certifications_supplier_id_idx`(`supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── CreateTable: supplier_impacts ───────────────────────────────────────
CREATE TABLE `supplier_impacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplier_id` INTEGER NOT NULL,
    `production_run_id` INTEGER NULL,
    `scope` ENUM('FACILITY', 'PRODUCTION_RUN') NOT NULL DEFAULT 'FACILITY',
    `category` ENUM('GHG', 'WATER', 'ENERGY', 'WASTE', 'LAND_USE', 'BIODIVERSITY', 'CHEMICAL') NOT NULL,
    `value` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `data_quality` ENUM('MEASURED', 'ESTIMATED', 'BENCHMARKED') NOT NULL DEFAULT 'BENCHMARKED',
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `period` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `certification_ref` VARCHAR(191) NULL,
    `reviewed_by` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `supplier_impacts_supplier_id_idx`(`supplier_id`),
    INDEX `supplier_impacts_production_run_id_idx`(`production_run_id`),
    INDEX `supplier_impacts_category_supplier_id_idx`(`category`, `supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── CreateTable: colour_map ──────────────────────────────────────────────
CREATE TABLE `colour_map` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mill_colour_code` VARCHAR(191) NOT NULL,
    `mill_colour_name` VARCHAR(191) NULL,
    `sheep_inc_name` VARCHAR(191) NOT NULL,
    `sheep_inc_code` VARCHAR(191) NULL,
    `hex_value` VARCHAR(191) NULL,
    `yarn_mill` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `colour_map_mill_colour_code_key`(`mill_colour_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── CreateTable: yarn_deliveries ────────────────────────────────────────
CREATE TABLE `yarn_deliveries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `delivery_note_ref` VARCHAR(191) NOT NULL,
    `supplier_id` INTEGER NULL,
    `yarn_mill` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'PARTIAL', 'ISSUE') NOT NULL DEFAULT 'PENDING',
    `delivery_date` DATETIME(3) NULL,
    `confirmed_date` DATETIME(3) NULL,
    `confirmed_by` INTEGER NULL,
    `total_cones` INTEGER NOT NULL DEFAULT 0,
    `total_net_kg` DOUBLE NOT NULL DEFAULT 0,
    `total_gross_kg` DOUBLE NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `raw_pdf_text` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `yarn_deliveries_delivery_note_ref_key`(`delivery_note_ref`),
    INDEX `yarn_deliveries_supplier_id_idx`(`supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── CreateTable: yarn_delivery_lines ────────────────────────────────────
CREATE TABLE `yarn_delivery_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `delivery_id` INTEGER NOT NULL,
    `yarn_type` VARCHAR(191) NOT NULL,
    `colour_code` VARCHAR(191) NOT NULL,
    `colour_name` VARCHAR(191) NULL,
    `composition` VARCHAR(191) NULL,
    `lot_number` VARCHAR(191) NULL,
    `prod_lot` VARCHAR(191) NULL,
    `box_id` VARCHAR(191) NULL,
    `cones` INTEGER NOT NULL DEFAULT 0,
    `gross_kg` DOUBLE NOT NULL DEFAULT 0,
    `net_kg` DOUBLE NOT NULL DEFAULT 0,
    `cond_kg` DOUBLE NULL,
    `remaining_kg` DOUBLE NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `yarn_delivery_lines_delivery_id_idx`(`delivery_id`),
    INDEX `yarn_delivery_lines_colour_code_idx`(`colour_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── CreateTable: run_size_breakdown ─────────────────────────────────────
CREATE TABLE `run_size_breakdown` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_run_id` INTEGER NOT NULL,
    `order_line_id` INTEGER NULL,
    `size` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `produced` INTEGER NOT NULL DEFAULT 0,

    INDEX `run_size_breakdown_production_run_id_idx`(`production_run_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── CreateTable: edit_log ────────────────────────────────────────────────
CREATE TABLE `edit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `field` VARCHAR(191) NOT NULL,
    `old_value` TEXT NULL,
    `new_value` TEXT NULL,
    `note` TEXT NULL,
    `changed_by` VARCHAR(191) NULL,
    `role` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `edit_log_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── Indexes ──────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX `garments_external_id_key` ON `garments`(`external_id`);
CREATE UNIQUE INDEX `material_colors_external_id_key` ON `material_colors`(`external_id`);
CREATE UNIQUE INDEX `order_lines_external_id_key` ON `order_lines`(`external_id`);
CREATE UNIQUE INDEX `orders_external_id_key` ON `orders`(`external_id`);
CREATE UNIQUE INDEX `production_runs_external_id_key` ON `production_runs`(`external_id`);
CREATE INDEX `production_runs_order_id_idx` ON `production_runs`(`order_id`);

-- ─── Foreign Keys ─────────────────────────────────────────────────────────
ALTER TABLE `users` ADD CONSTRAINT `users_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `facility_profiles` ADD CONSTRAINT `facility_profiles_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `supplier_certifications` ADD CONSTRAINT `supplier_certifications_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `supplier_impacts` ADD CONSTRAINT `supplier_impacts_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `supplier_impacts` ADD CONSTRAINT `supplier_impacts_production_run_id_fkey` FOREIGN KEY (`production_run_id`) REFERENCES `production_runs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `yarn_deliveries` ADD CONSTRAINT `yarn_deliveries_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `yarn_delivery_lines` ADD CONSTRAINT `yarn_delivery_lines_delivery_id_fkey` FOREIGN KEY (`delivery_id`) REFERENCES `yarn_deliveries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `orders` ADD CONSTRAINT `orders_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `production_runs` ADD CONSTRAINT `production_runs_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `production_runs` ADD CONSTRAINT `production_runs_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `run_size_breakdown` ADD CONSTRAINT `run_size_breakdown_production_run_id_fkey` FOREIGN KEY (`production_run_id`) REFERENCES `production_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'EDITOR', 'VIEWER') NOT NULL DEFAULT 'EDITOR',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_colors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `color_code` VARCHAR(191) NULL,
    `hex_value` VARCHAR(191) NULL,
    `yarn_type` VARCHAR(191) NULL,
    `manufacturer` VARCHAR(191) NULL,
    `stock_weight_kg` DOUBLE NOT NULL DEFAULT 0,
    `remaining_kg` DOUBLE NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `external_id` INTEGER NULL,
    `last_sync_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `material_colors_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_ref` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'QC', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `manufacturer` VARCHAR(191) NULL,
    `client` VARCHAR(191) NULL,
    `due_date` DATETIME(3) NULL,
    `total_quantity` INTEGER NOT NULL DEFAULT 0,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `external_id` INTEGER NULL,
    `last_sync_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_order_ref_key`(`order_ref`),
    INDEX `orders_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `product` VARCHAR(191) NOT NULL,
    `color_id` INTEGER NULL,
    `size` VARCHAR(191) NULL,
    `style` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `unit_price` DOUBLE NULL,
    `notes` TEXT NULL,
    `external_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `order_lines_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_runs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `run_code` VARCHAR(191) NOT NULL,
    `order_line_id` INTEGER NULL,
    `status` ENUM('PLANNED', 'IN_PRODUCTION', 'QC', 'SHIPPED', 'COMPLETED') NOT NULL DEFAULT 'PLANNED',
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `units_produced` INTEGER NOT NULL DEFAULT 0,
    `input_units` INTEGER NOT NULL DEFAULT 0,
    `washing_program` VARCHAR(191) NULL,
    `washing_temperature` DOUBLE NULL,
    `finishing_process` VARCHAR(191) NULL,
    `machine_gauge` VARCHAR(191) NULL,
    `knitwear_ply` VARCHAR(191) NULL,
    `start_date` DATETIME(3) NULL,
    `expected_completion` DATETIME(3) NULL,
    `actual_completion` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `external_id` INTEGER NULL,
    `last_sync_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `production_runs_run_code_key`(`run_code`),
    INDEX `production_runs_order_line_id_idx`(`order_line_id`),
    INDEX `production_runs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yarn_compositions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_run_id` INTEGER NOT NULL,
    `yarn_type` VARCHAR(191) NOT NULL,
    `percentage` DOUBLE NOT NULL,
    `color_ref` VARCHAR(191) NULL,

    INDEX `yarn_compositions_production_run_id_idx`(`production_run_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `garments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `garment_code` VARCHAR(191) NOT NULL,
    `production_run_id` INTEGER NULL,
    `color_id` INTEGER NULL,
    `size` VARCHAR(191) NULL,
    `style` VARCHAR(191) NULL,
    `product` VARCHAR(191) NULL,
    `nfc_tag_id` VARCHAR(191) NULL,
    `qr_code` VARCHAR(191) NULL,
    `traceability_url` VARCHAR(191) NULL,
    `last_latitude` DOUBLE NULL,
    `last_longitude` DOUBLE NULL,
    `last_location_name` VARCHAR(191) NULL,
    `location_updated_at` DATETIME(3) NULL,
    `is_tagged` BOOLEAN NOT NULL DEFAULT false,
    `tagged_at` DATETIME(3) NULL,
    `manufacturer` VARCHAR(191) NULL,
    `finisher` VARCHAR(191) NULL,
    `external_id` INTEGER NULL,
    `last_sync_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `garments_garment_code_key`(`garment_code`),
    UNIQUE INDEX `garments_nfc_tag_id_key`(`nfc_tag_id`),
    UNIQUE INDEX `garments_qr_code_key`(`qr_code`),
    INDEX `garments_production_run_id_idx`(`production_run_id`),
    INDEX `garments_color_id_idx`(`color_id`),
    INDEX `garments_is_tagged_idx`(`is_tagged`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qr_change_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `garment_id` INTEGER NOT NULL,
    `old_qr_code` VARCHAR(191) NULL,
    `new_qr_code` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `changed_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `qr_change_log_garment_id_idx`(`garment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scan_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `garment_id` INTEGER NULL,
    `scan_type` ENUM('NFC_READ', 'NFC_WRITE', 'QR_SCAN', 'QR_GENERATE') NOT NULL,
    `tag_data` TEXT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `user_id` INTEGER NULL,
    `device_info` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `scan_events_garment_id_idx`(`garment_id`),
    INDEX `scan_events_scan_type_created_at_idx`(`scan_type`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shopify_products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopify_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `variant_id` VARCHAR(191) NULL,
    `sku` VARCHAR(191) NULL,
    `inventory_qty` INTEGER NOT NULL DEFAULT 0,
    `last_sync_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shopify_products_shopify_id_key`(`shopify_id`),
    INDEX `shopify_products_sku_idx`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entity_type` VARCHAR(191) NOT NULL,
    `direction` ENUM('PULL', 'PUSH') NOT NULL,
    `record_count` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'success',
    `error_msg` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sync_log_entity_type_created_at_idx`(`entity_type`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_settings` (
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_lines` ADD CONSTRAINT `order_lines_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_lines` ADD CONSTRAINT `order_lines_color_id_fkey` FOREIGN KEY (`color_id`) REFERENCES `material_colors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_runs` ADD CONSTRAINT `production_runs_order_line_id_fkey` FOREIGN KEY (`order_line_id`) REFERENCES `order_lines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yarn_compositions` ADD CONSTRAINT `yarn_compositions_production_run_id_fkey` FOREIGN KEY (`production_run_id`) REFERENCES `production_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `garments` ADD CONSTRAINT `garments_production_run_id_fkey` FOREIGN KEY (`production_run_id`) REFERENCES `production_runs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `garments` ADD CONSTRAINT `garments_color_id_fkey` FOREIGN KEY (`color_id`) REFERENCES `material_colors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_change_log` ADD CONSTRAINT `qr_change_log_garment_id_fkey` FOREIGN KEY (`garment_id`) REFERENCES `garments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scan_events` ADD CONSTRAINT `scan_events_garment_id_fkey` FOREIGN KEY (`garment_id`) REFERENCES `garments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

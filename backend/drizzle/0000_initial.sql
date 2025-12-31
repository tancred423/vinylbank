-- Initial schema
CREATE TABLE IF NOT EXISTS `media_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `media_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('available','borrowed','lost') NOT NULL DEFAULT 'available',
	`borrowed_by` varchar(255),
	`borrowed_date` date,
	`notes` text,
	`cover_image` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `media_attributes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`media_id` int NOT NULL,
	`attribute_key` varchar(255) NOT NULL,
	`attribute_value` longtext,
	CONSTRAINT `media_attributes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `media_type_fields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type_id` int NOT NULL,
	`field_key` varchar(255) NOT NULL,
	`field_label` varchar(255) NOT NULL,
	`field_type` enum('text','number','date','select','textarea','boolean','checkbox','radio','image','rating','keyvalue') NOT NULL DEFAULT 'text',
	`required` int NOT NULL DEFAULT 0,
	`options` text,
	`display_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_type_fields_id` PRIMARY KEY(`id`)
);


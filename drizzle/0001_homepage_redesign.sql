ALTER TABLE `categories` ADD `description` text;--> statement-breakpoint
ALTER TABLE `categories` ADD `photo_key` text;--> statement-breakpoint
ALTER TABLE `subcategories` ADD `description` text;--> statement-breakpoint
ALTER TABLE `subcategories` ADD `photo_key` text;--> statement-breakpoint
ALTER TABLE `products` ADD `featured` integer DEFAULT 0 NOT NULL;

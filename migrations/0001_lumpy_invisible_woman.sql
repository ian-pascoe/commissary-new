PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_provider_models` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`provider_id` text NOT NULL,
	`model_id` text NOT NULL,
	`slug` text NOT NULL,
	`input_modalities` text NOT NULL,
	`output_modalities` text NOT NULL,
	`tokenizer` text NOT NULL,
	`context_length` integer,
	`max_output_tokens` integer,
	`supported_parameters` text,
	`pricing_input` numeric,
	`pricing_output` numeric,
	`pricing_image` numeric,
	`pricing_request` numeric,
	`pricing_web_search` numeric,
	`pricing_internal_reasoning` numeric,
	`pricing_input_cache_read` numeric,
	`pricing_input_cache_write` numeric,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_provider_models`("id", "created_at", "updated_at", "provider_id", "model_id", "slug", "input_modalities", "output_modalities", "tokenizer", "context_length", "max_output_tokens", "supported_parameters", "pricing_input", "pricing_output", "pricing_image", "pricing_request", "pricing_web_search", "pricing_internal_reasoning", "pricing_input_cache_read", "pricing_input_cache_write") SELECT "id", "created_at", "updated_at", "provider_id", "model_id", "slug", "input_modalities", "output_modalities", "tokenizer", "context_length", "max_output_tokens", "supported_parameters", "pricing_input", "pricing_output", "pricing_image", "pricing_request", "pricing_web_search", "pricing_internal_reasoning", "pricing_input_cache_read", "pricing_input_cache_write" FROM `provider_models`;--> statement-breakpoint
DROP TABLE `provider_models`;--> statement-breakpoint
ALTER TABLE `__new_provider_models` RENAME TO `provider_models`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `provider_models_provider_id_idx` ON `provider_models` (`provider_id`);--> statement-breakpoint
CREATE INDEX `provider_models_model_id_idx` ON `provider_models` (`model_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `provider_models_provider_id_slug_idx` ON `provider_models` (`provider_id`,`slug`);
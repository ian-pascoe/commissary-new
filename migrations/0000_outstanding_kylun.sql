CREATE TABLE `models` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text,
	`description` text,
	`hugging_face_id` text,
	`input_modalities` text NOT NULL,
	`output_modalities` text NOT NULL,
	`tokenizer` text NOT NULL,
	`context_length` integer,
	`supported_parameters` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `models_slug_idx` ON `models` (`slug`);--> statement-breakpoint
CREATE INDEX `models_name_idx` ON `models` (`name`);--> statement-breakpoint
CREATE INDEX `models_hugging_face_id_idx` ON `models` (`hugging_face_id`);--> statement-breakpoint
CREATE TABLE `provider_models` (
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
	`pricing_input` integer,
	`pricing_output` integer,
	`pricing_image` integer,
	`pricing_request` integer,
	`pricing_web_search` integer,
	`pricing_internal_reasoning` integer,
	`pricing_input_cache_read` integer,
	`pricing_input_cache_write` integer,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `provider_models_provider_id_idx` ON `provider_models` (`provider_id`);--> statement-breakpoint
CREATE INDEX `provider_models_model_id_idx` ON `provider_models` (`model_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `provider_models_provider_id_slug_idx` ON `provider_models` (`provider_id`,`slug`);--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`icon_url` text,
	`description` text,
	`privacy_policy_url` text,
	`terms_of_service_url` text,
	`status_page_url` text,
	`may_log_prompts` integer DEFAULT false,
	`may_train_on_data` integer DEFAULT false,
	`is_moderated` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `providers_slug_idx` ON `providers` (`slug`);--> statement-breakpoint
CREATE INDEX `providers_name_idx` ON `providers` (`name`);
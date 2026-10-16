CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`event_id` text NOT NULL,
	`role` text NOT NULL,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`metadata_json` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `chat_messages_session_idx` ON `chat_messages` (`session_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `chat_messages_event_idx` ON `chat_messages` (`session_id`,`event_id`,`kind`);--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`nickname` text NOT NULL,
	`visitor_name` text,
	`surface` text NOT NULL,
	`started_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`closed_at` text
);
--> statement-breakpoint
CREATE INDEX `chat_sessions_updated_idx` ON `chat_sessions` (`updated_at`,`id`);--> statement-breakpoint
CREATE TABLE `chat_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`response_json` text,
	`response_status` integer,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `chat_turns_session_idx` ON `chat_turns` (`session_id`,`started_at`);
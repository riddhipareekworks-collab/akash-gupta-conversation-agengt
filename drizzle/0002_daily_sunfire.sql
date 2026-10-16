CREATE TABLE `demo_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`session_id` text NOT NULL,
	`show_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`email` text NOT NULL,
	`receipt_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_bookings_request_id_unique` ON `demo_bookings` (`request_id`);--> statement-breakpoint
CREATE INDEX `demo_bookings_session_idx` ON `demo_bookings` (`session_id`,`created_at`);
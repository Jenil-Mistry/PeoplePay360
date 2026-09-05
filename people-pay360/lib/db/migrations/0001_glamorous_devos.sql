ALTER TABLE "time_off_allocations" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "time_off_allocations" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::text;--> statement-breakpoint
ALTER TABLE "time_off_requests" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "time_off_requests" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::text;--> statement-breakpoint
DROP TYPE "public"."time_off_status";--> statement-breakpoint
CREATE TYPE "public"."time_off_status" AS ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
ALTER TABLE "time_off_allocations" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::time_off_status;--> statement-breakpoint
ALTER TABLE "time_off_allocations" ALTER COLUMN "status" SET DATA TYPE time_off_status USING "status"::time_off_status;--> statement-breakpoint
ALTER TABLE "time_off_requests" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::time_off_status;--> statement-breakpoint
ALTER TABLE "time_off_requests" ALTER COLUMN "status" SET DATA TYPE time_off_status USING "status"::time_off_status;
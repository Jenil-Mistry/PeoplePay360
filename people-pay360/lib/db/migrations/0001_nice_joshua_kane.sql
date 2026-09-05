ALTER TABLE "salary_rules" DROP CONSTRAINT "salary_rules_valid_computation";--> statement-breakpoint
ALTER TABLE "salary_rules" ADD CONSTRAINT "salary_rules_valid_computation" CHECK ((
    ("salary_rules"."computation_type" = 'FIXED' AND "salary_rules"."amount" IS NOT NULL)
    OR ("salary_rules"."computation_type" = 'PERCENTAGE' AND "salary_rules"."percentage" IS NOT NULL)
    OR ("salary_rules"."computation_type" = 'FORMULA' AND "salary_rules"."formula" IS NOT NULL)
  ));
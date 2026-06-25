-- AddUniqueConstraint: plan name must be unique within a gym
ALTER TABLE "public"."MembershipPlan" ADD CONSTRAINT "MembershipPlan_gymId_name_key" UNIQUE ("gymId","name");

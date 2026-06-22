-- AlterTable: make phoneNumber non-nullable
ALTER TABLE "public"."Member" ALTER COLUMN "phoneNumber" SET NOT NULL;

-- CreateIndex: unique email per gym
CREATE UNIQUE INDEX "Member_gymId_email_key" ON "public"."Member"("gymId", "email");

-- CreateIndex: unique phone per gym
CREATE UNIQUE INDEX "Member_gymId_phoneNumber_key" ON "public"."Member"("gymId", "phoneNumber");

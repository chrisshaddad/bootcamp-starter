-- Link org members to optional login accounts
ALTER TABLE "Member" ADD COLUMN "userId" TEXT;

-- Rename domain member role MEMBER -> PRESENTER
ALTER TYPE "MemberRole" RENAME VALUE 'MEMBER' TO 'PRESENTER';

-- Update default role for new members
ALTER TABLE "Member" ALTER COLUMN "role" SET DEFAULT 'PRESENTER';

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE INDEX "Member_userId_idx" ON "Member"("userId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

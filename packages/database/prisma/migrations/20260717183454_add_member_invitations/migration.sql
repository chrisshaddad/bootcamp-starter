-- CreateTable
CREATE TABLE "private"."MemberInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'PRESENTER',
    "organizationId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberInvitation_tokenHash_key" ON "private"."MemberInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "MemberInvitation_organizationId_idx" ON "private"."MemberInvitation"("organizationId");

-- CreateIndex
CREATE INDEX "MemberInvitation_email_idx" ON "private"."MemberInvitation"("email");

-- CreateIndex
CREATE INDEX "MemberInvitation_expiresAt_idx" ON "private"."MemberInvitation"("expiresAt");

-- AddForeignKey
ALTER TABLE "private"."MemberInvitation" ADD CONSTRAINT "MemberInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private"."MemberInvitation" ADD CONSTRAINT "MemberInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

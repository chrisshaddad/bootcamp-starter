-- CreateIndex
CREATE INDEX IF NOT EXISTS "Assignment_createdById_idx"
ON "Assignment"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Meeting_hostId_idx"
ON "Meeting"("hostId");
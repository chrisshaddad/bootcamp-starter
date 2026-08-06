-- AlterTable
ALTER TABLE "DeveloperProfile" ADD COLUMN     "embedding" vector(384);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "embedding" vector(384);

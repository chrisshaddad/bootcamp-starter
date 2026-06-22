-- Preflight: fail early with a clear message if duplicates exist
DO $$
BEGIN
  IF EXISTS (
    SELECT "name" FROM "public"."Gym" GROUP BY "name" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create unique index: duplicate gym names exist. Resolve them before re-running this migration.';
  END IF;
END
$$;

-- CreateIndex
CREATE UNIQUE INDEX "Gym_name_key" ON "public"."Gym"("name");

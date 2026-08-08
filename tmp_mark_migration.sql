UPDATE "_prisma_migrations"
SET finished_at = now(), applied_steps_count = 1
WHERE migration_name = '20260724011810_drop_book_condition_rent_price';

SELECT id, migration_name, finished_at, applied_steps_count FROM "_prisma_migrations" ORDER BY finished_at NULLS FIRST;

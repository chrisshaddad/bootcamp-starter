ALTER TABLE "Grade"
ADD CONSTRAINT "Grade_exactly_one_target_chk"
CHECK (
  (CASE WHEN "submissionId" IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN "quizAttemptId" IS NULL THEN 0 ELSE 1 END) = 1
);
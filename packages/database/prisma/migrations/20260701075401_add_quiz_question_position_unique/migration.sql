/*
  Warnings:

  - A unique constraint covering the columns `[assignmentId,position]` on the table `QuizQuestion` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_assignmentId_position_key" ON "QuizQuestion"("assignmentId", "position");

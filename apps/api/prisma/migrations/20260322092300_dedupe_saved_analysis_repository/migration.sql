-- Add normalized repository key for repository-level deduplication
ALTER TABLE "SavedAnalysis"
ADD COLUMN "repositoryKey" TEXT;

UPDATE "SavedAnalysis"
SET "repositoryKey" = LOWER(BTRIM("owner")) || '/' || LOWER(BTRIM("repo"))
WHERE "repositoryKey" IS NULL;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "repositoryKey"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS "rank"
  FROM "SavedAnalysis"
)
DELETE FROM "SavedAnalysis" AS "saved"
USING ranked
WHERE "saved"."id" = ranked."id"
  AND ranked."rank" > 1;

ALTER TABLE "SavedAnalysis"
ALTER COLUMN "repositoryKey" SET NOT NULL;

DROP INDEX IF EXISTS "SavedAnalysis_userId_createdAt_idx";

CREATE UNIQUE INDEX "SavedAnalysis_userId_repositoryKey_key"
ON "SavedAnalysis"("userId", "repositoryKey");

CREATE INDEX "SavedAnalysis_userId_updatedAt_idx"
ON "SavedAnalysis"("userId", "updatedAt" DESC);

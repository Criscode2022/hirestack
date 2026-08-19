CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Job_title_trgm_idx" ON "Job" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Job_location_trgm_idx" ON "Job" USING GIN ("location" gin_trgm_ops);

-- 0056_ai_usage_source.sql — was this AI call asked for, or did the system decide to make it?
--
-- WHY THIS COLUMN EXISTS. `ai_usage` records what every LLM call cost, but not who wanted it, and
-- those are different questions with different answers. Advice is generated BOTH ways: a farmer can
-- press "generate" and stand there waiting, and the geo pipeline fires POST /api/internal/advice/run
-- automatically after every new satellite scene with nobody watching. Today both land in the ledger
-- as kind='advice', indistinguishable.
--
-- That ambiguity blocks a real decision. The Batch API is 50% off in exchange for "some time within
-- 24 hours", which is free money for a call nobody is waiting on and unacceptable for one where a
-- farmer is staring at a spinner. Choosing needs the split, and right now the split can only be
-- guessed. Same for rate limiting, for deciding which path deserves the expensive model, and for
-- answering "how much does one active farmer actually cost us".
--
-- 'auto'  — the system started it: the pipeline after a scene, a cron, the research worker.
-- 'user'  — a human action started it and is plausibly waiting: chat, manual regenerate, a photo
--           upload, a lab-sheet OCR.
-- NULL    — a row written before this column existed. Deliberately NOT backfilled to a guess: 27 of
--           the 29 historical advice rows are probably automatic, but "probably" is not a number,
--           and a fabricated value would be indistinguishable from a measured one the moment
--           somebody runs a GROUP BY over it. Exclude NULLs from any ratio and say so.
--
-- Additive and safe to apply while the old image is still serving: nothing reads it until the new
-- code lands, and every existing INSERT omits it, which is exactly what the default handles.
alter table public.ai_usage
  add column if not exists source text;

comment on column public.ai_usage.source is
  'Who initiated this call: auto (pipeline/cron, nobody waiting → batch candidate) | user (a human is plausibly waiting) | NULL (pre-0056 row, never backfilled — exclude from ratios).';

-- The question this column is for is always "auto vs user over a period", so the period leads.
create index if not exists ai_usage_source_idx on public.ai_usage (source, created_at desc);

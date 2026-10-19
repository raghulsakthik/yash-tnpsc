-- Some reasoning questions (seating diagrams, dice nets, cube views) are
-- genuinely unsolvable from text alone -- the figure *is* the question.
-- When the admin PDF-upload pipeline can't turn a diagram into text, it
-- keeps a screenshot of that page instead of silently dropping the figure.

ALTER TABLE question ADD COLUMN image_data TEXT;

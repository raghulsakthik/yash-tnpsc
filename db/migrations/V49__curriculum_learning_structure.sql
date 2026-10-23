-- NOVA curriculum/learning-structure v1.
-- Additive only: the existing subject/chapter/topic/question engines remain
-- source-compatible while the new course model is introduced above them.

CREATE TABLE exam (
    id              TEXT PRIMARY KEY,
    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 0,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE curriculum (
    id          TEXT PRIMARY KEY,
    exam_id     TEXT NOT NULL REFERENCES exam(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    version     TEXT NOT NULL DEFAULT '1.0',
    status      TEXT NOT NULL DEFAULT 'DRAFT',
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT curriculum_status_ck CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED'))
);

CREATE UNIQUE INDEX curriculum_exam_version_idx ON curriculum(exam_id, version);

CREATE TABLE curriculum_section (
    id              TEXT PRIMARY KEY,
    curriculum_id   TEXT NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE(curriculum_id, code)
);

CREATE TABLE curriculum_subject (
    curriculum_id   TEXT NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
    section_id      TEXT NOT NULL REFERENCES curriculum_section(id) ON DELETE CASCADE,
    subject_id      TEXT NOT NULL REFERENCES subject(id) ON DELETE CASCADE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(curriculum_id, subject_id)
);

CREATE TABLE learning_phase (
    id              TEXT PRIMARY KEY,
    curriculum_id   TEXT NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    level           INTEGER NOT NULL,
    sort_order      INTEGER NOT NULL,
    duration_weeks  INTEGER,
    UNIQUE(curriculum_id, code),
    UNIQUE(curriculum_id, sort_order),
    CONSTRAINT learning_phase_level_ck CHECK (level BETWEEN 0 AND 6),
    CONSTRAINT learning_phase_duration_ck CHECK (duration_weeks IS NULL OR duration_weeks > 0)
);

CREATE TABLE learning_week (
    id              TEXT PRIMARY KEY,
    phase_id        TEXT NOT NULL REFERENCES learning_phase(id) ON DELETE CASCADE,
    week_number     INTEGER NOT NULL,
    title           TEXT NOT NULL,
    objective       TEXT,
    UNIQUE(phase_id, week_number),
    CONSTRAINT learning_week_number_ck CHECK (week_number > 0)
);

CREATE TABLE learning_day (
    id              TEXT PRIMARY KEY,
    week_id         TEXT NOT NULL REFERENCES learning_week(id) ON DELETE CASCADE,
    day_number      INTEGER NOT NULL,
    title           TEXT NOT NULL,
    purpose         TEXT,
    target_minutes  INTEGER,
    UNIQUE(week_id, day_number),
    CONSTRAINT learning_day_number_ck CHECK (day_number BETWEEN 1 AND 7),
    CONSTRAINT learning_day_minutes_ck CHECK (target_minutes IS NULL OR target_minutes > 0)
);

CREATE TABLE learning_unit (
    id                TEXT PRIMARY KEY,
    day_id            TEXT NOT NULL REFERENCES learning_day(id) ON DELETE CASCADE,
    topic_id          TEXT REFERENCES topic(id) ON DELETE SET NULL,
    title             TEXT NOT NULL,
    unit_type         TEXT NOT NULL,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    estimated_minutes INTEGER,
    required          BOOLEAN NOT NULL DEFAULT true,
    metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT learning_unit_type_ck CHECK (unit_type IN ('CONCEPT','GUIDED_PRACTICE','APPLICATION','EXAM_PRACTICE','PYQ','SPEED','REVISION','TEST','REMEDIATION')),
    CONSTRAINT learning_unit_minutes_ck CHECK (estimated_minutes IS NULL OR estimated_minutes > 0)
);

CREATE INDEX learning_unit_topic_idx ON learning_unit(topic_id);

CREATE TABLE learning_concept (
    id              TEXT PRIMARY KEY,
    topic_id        TEXT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    definition      TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE(topic_id, name)
);

CREATE TABLE content_item (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id      TEXT REFERENCES learning_concept(id) ON DELETE SET NULL,
    topic_id        TEXT REFERENCES topic(id) ON DELETE SET NULL,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT,
    question_id     TEXT REFERENCES question(id) ON DELETE SET NULL,
    lesson_topic_id TEXT REFERENCES topic(id) ON DELETE SET NULL,
    resource_id     UUID REFERENCES topic_resource(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'DRAFT',
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT content_item_type_ck CHECK (type IN ('VIDEO','NOTES','EXAMPLE','FLASHCARD','MCQ','PYQ','PRACTICE')),
    CONSTRAINT content_item_status_ck CHECK (status IN ('DRAFT','REVIEWED','PUBLISHED','ARCHIVED'))
);

CREATE INDEX content_item_concept_idx ON content_item(concept_id, type);
CREATE INDEX content_item_topic_idx ON content_item(topic_id, type);

CREATE TABLE milestone (
    id              TEXT PRIMARY KEY,
    curriculum_id   TEXT NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
    phase_id        TEXT REFERENCES learning_phase(id) ON DELETE SET NULL,
    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    unlock_rules    JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE(curriculum_id, code)
);

CREATE TABLE learner_curriculum (
    learner_id       UUID NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
    curriculum_id    TEXT NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
    status            TEXT NOT NULL DEFAULT 'ACTIVE',
    current_phase_id TEXT REFERENCES learning_phase(id) ON DELETE SET NULL,
    current_week_id  TEXT REFERENCES learning_week(id) ON DELETE SET NULL,
    current_day_id   TEXT REFERENCES learning_day(id) ON DELETE SET NULL,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY(learner_id, curriculum_id),
    CONSTRAINT learner_curriculum_status_ck CHECK (status IN ('ACTIVE','PAUSED','COMPLETED','ARCHIVED'))
);

CREATE TABLE learner_unit_progress (
    learner_id    UUID NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
    unit_id       TEXT NOT NULL REFERENCES learning_unit(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'NOT_STARTED',
    score         NUMERIC(5,2),
    attempts      INTEGER NOT NULL DEFAULT 0,
    started_at    TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY(learner_id, unit_id),
    CONSTRAINT learner_unit_status_ck CHECK (status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED','REMEDIAL')),
    CONSTRAINT learner_unit_score_ck CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE TABLE learner_milestone (
    learner_id      UUID NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
    milestone_id    TEXT NOT NULL REFERENCES milestone(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'LOCKED',
    progress        NUMERIC(5,2) NOT NULL DEFAULT 0,
    achieved_at     TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY(learner_id, milestone_id),
    CONSTRAINT learner_milestone_status_ck CHECK (status IN ('LOCKED','IN_PROGRESS','ACHIEVED')),
    CONSTRAINT learner_milestone_progress_ck CHECK (progress >= 0 AND progress <= 100)
);

-- Initial TNPSC curriculum shell. Existing syllabus tables remain authoritative
-- for chapter/topic content until the admin curriculum builder migrates units.
INSERT INTO exam(id, code, name, total_questions)
VALUES ('tnpsc-group-2', '495', 'TNPSC Group 2 / IIA Preliminary Examination', 200)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, name=EXCLUDED.name, total_questions=EXCLUDED.total_questions, updated_at=now();

INSERT INTO curriculum(id, exam_id, name, version, status)
VALUES ('tnpsc-group-2-v1', 'tnpsc-group-2', 'TNPSC Group 2 Adaptive Curriculum', '1.0', 'DRAFT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO curriculum_section(id, curriculum_id, code, name, sort_order)
VALUES
 ('tnpsc2.general-studies','tnpsc-group-2-v1','GS','General Studies',1),
 ('tnpsc2.aptitude','tnpsc-group-2-v1','APTITUDE','Aptitude and Mental Ability',2),
 ('tnpsc2.language','tnpsc-group-2-v1','LANGUAGE','Language',3),
 ('tnpsc2.current-affairs','tnpsc-group-2-v1','CURRENT_AFFAIRS','Current Affairs',4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO curriculum_subject(curriculum_id, section_id, subject_id, sort_order)
SELECT 'tnpsc-group-2-v1',
       CASE WHEN id='general-studies' THEN 'tnpsc2.general-studies'
            WHEN id='aptitude-mental-ability' THEN 'tnpsc2.aptitude'
            WHEN id IN ('language-en','language-ta') THEN 'tnpsc2.language'
            ELSE 'tnpsc2.current-affairs' END,
       id, sort_order
FROM subject
WHERE id IN ('general-studies','aptitude-mental-ability','language-en','language-ta')
ON CONFLICT (curriculum_id, subject_id) DO UPDATE SET section_id=EXCLUDED.section_id, sort_order=EXCLUDED.sort_order;

INSERT INTO learning_phase(id,curriculum_id,code,name,description,level,sort_order,duration_weeks)
VALUES
 ('tnpsc2.phase.orientation','tnpsc-group-2-v1','ORIENTATION','Orientation','Understand the exam, syllabus, study rhythm, PYQs and testing system.',0,0,1),
 ('tnpsc2.phase.foundation','tnpsc-group-2-v1','FOUNDATION','Foundation','Build prerequisite knowledge before exam-level practice.',1,1,6),
 ('tnpsc2.phase.core','tnpsc-group-2-v1','CORE','Core','Build reliable subject knowledge and normal question-solving ability.',2,2,8),
 ('tnpsc2.phase.exam','tnpsc-group-2-v1','EXAM','Exam Level','Solve syllabus-aligned TNPSC questions and PYQs.',3,3,8),
 ('tnpsc2.phase.advanced','tnpsc-group-2-v1','ADVANCED','Advanced','Handle difficult and multi-step questions.',4,4,6),
 ('tnpsc2.phase.competitive','tnpsc-group-2-v1','COMPETITIVE','Competitive','Build speed, accuracy and pressure performance.',5,5,4),
 ('tnpsc2.phase.ready','tnpsc-group-2-v1','EXAM_READY','Exam Ready','Convert stable performance into full-mock readiness.',6,6,4)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, duration_weeks=EXCLUDED.duration_weeks;

INSERT INTO milestone(id,curriculum_id,phase_id,code,name,description,sort_order,unlock_rules)
VALUES
 ('tnpsc2.milestone.foundation','tnpsc-group-2-v1','tnpsc2.phase.foundation','FOUNDATION_COMPLETE','Foundation Completed','Core prerequisites are understood and the foundation assessment is passed.',1,'{"minimum_weekly_average":80,"assessment_required":true}'),
 ('tnpsc2.milestone.arithmetic-core','tnpsc-group-2-v1','tnpsc2.phase.core','ARITHMETIC_CORE','Arithmetic Core','Core arithmetic topics can be solved reliably.',2,'{"minimum_mastery":0.75}'),
 ('tnpsc2.milestone.aptitude-ready','tnpsc-group-2-v1','tnpsc2.phase.exam','APTITUDE_READY','Aptitude Ready','Aptitude topics meet the exam-level readiness threshold.',3,'{"minimum_mastery":0.80}'),
 ('tnpsc2.milestone.exam-ready','tnpsc-group-2-v1','tnpsc2.phase.ready','EXAM_READY','Exam Ready','Full-length mocks show consistent exam-ready performance.',4,'{"minimum_mock_average":80,"minimum_mock_count":3}')
ON CONFLICT (id) DO NOTHING;

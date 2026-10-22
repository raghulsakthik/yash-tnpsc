-- First executable slice of the canonical adaptive curriculum.
-- The source specification defines the 7-day weekly cycle; content is linked
-- only to existing authoritative topics, avoiding duplicate topic records.

INSERT INTO learning_week (id, phase_id, week_number, title, objective)
VALUES
 ('tnpsc2.phase.orientation.week-1','tnpsc2.phase.orientation',1,'Orientation & Exam Readiness','Understand the exam journey, curriculum structure, weekly rhythm and how diagnostics, practice, PYQs and tests drive the adaptive path.'),
 ('tnpsc2.phase.foundation.week-1','tnpsc2.phase.foundation',1,'Arithmetic Foundation','Build the first arithmetic foundations through concepts, guided practice, application, exam practice, PYQs, speed revision and a weekly test.')
ON CONFLICT (phase_id, week_number) DO NOTHING;

INSERT INTO learning_day (id, week_id, day_number, title, purpose, target_minutes)
SELECT w.id||'.day-'||d.day_number, w.id, d.day_number, d.title, d.purpose, d.target_minutes
FROM learning_week w
CROSS JOIN (VALUES
 (1,'Learn concepts','Build understanding of the week''s core concepts.',25),
 (2,'Guided practice','Apply concepts with guided examples and supported practice.',25),
 (3,'Application','Use the concepts in progressively independent problems.',25),
 (4,'Exam-level practice','Work with exam-oriented questions and timing.',25),
 (5,'PYQs','Practice relevant previous-year questions.',25),
 (6,'Speed + revision','Revise weak areas and improve response speed.',25),
 (7,'Weekly test','Measure the week''s learning and identify remediation.',30)
) AS d(day_number,title,purpose,target_minutes)
WHERE w.id IN ('tnpsc2.phase.orientation.week-1','tnpsc2.phase.foundation.week-1')
ON CONFLICT (week_id, day_number) DO NOTHING;

INSERT INTO learning_unit (id,day_id,topic_id,title,unit_type,sort_order,estimated_minutes,required)
VALUES
 ('tnpsc2.phase.orientation.week-1.day-1.unit-1','tnpsc2.phase.orientation.week-1.day-1',NULL,'Exam journey and adaptive learning model','CONCEPT',1,25,true),
 ('tnpsc2.phase.orientation.week-1.day-2.unit-1','tnpsc2.phase.orientation.week-1.day-2',NULL,'How weekly learning, practice, PYQs and tests connect','GUIDED_PRACTICE',1,25,true),
 ('tnpsc2.phase.orientation.week-1.day-3.unit-1','tnpsc2.phase.orientation.week-1.day-3',NULL,'Build a personal study rhythm','APPLICATION',1,25,true),
 ('tnpsc2.phase.orientation.week-1.day-4.unit-1','tnpsc2.phase.orientation.week-1.day-4',NULL,'Exam-level time awareness','EXAM_PRACTICE',1,25,true),
 ('tnpsc2.phase.orientation.week-1.day-5.unit-1','tnpsc2.phase.orientation.week-1.day-5',NULL,'Introduction to PYQ practice','PYQ',1,25,true),
 ('tnpsc2.phase.orientation.week-1.day-6.unit-1','tnpsc2.phase.orientation.week-1.day-6',NULL,'Revision and speed routine','SPEED',1,25,true),
 ('tnpsc2.phase.orientation.week-1.day-7.unit-1','tnpsc2.phase.orientation.week-1.day-7',NULL,'Orientation checkpoint','TEST',1,30,true),
 ('tnpsc2.phase.foundation.week-1.day-1.unit-1','tnpsc2.phase.foundation.week-1.day-1','aptitude.whole-numbers','Whole numbers and place value','CONCEPT',1,25,true),
 ('tnpsc2.phase.foundation.week-1.day-2.unit-1','tnpsc2.phase.foundation.week-1.day-2','aptitude.whole-numbers','Whole numbers guided practice','GUIDED_PRACTICE',1,25,true),
 ('tnpsc2.phase.foundation.week-1.day-3.unit-1','tnpsc2.phase.foundation.week-1.day-3','aptitude.whole-numbers','Whole numbers application','APPLICATION',1,25,true),
 ('tnpsc2.phase.foundation.week-1.day-4.unit-1','tnpsc2.phase.foundation.week-1.day-4','aptitude.whole-numbers','Whole numbers exam practice','EXAM_PRACTICE',1,25,true),
 ('tnpsc2.phase.foundation.week-1.day-5.unit-1','tnpsc2.phase.foundation.week-1.day-5','aptitude.whole-numbers','Whole numbers PYQs','PYQ',1,25,true),
 ('tnpsc2.phase.foundation.week-1.day-6.unit-1','tnpsc2.phase.foundation.week-1.day-6','aptitude.whole-numbers','Whole numbers speed revision','SPEED',1,25,true),
 ('tnpsc2.phase.foundation.week-1.day-7.unit-1','tnpsc2.phase.foundation.week-1.day-7','aptitude.whole-numbers','Foundation Week 1 test','TEST',1,30,true)
ON CONFLICT (id) DO NOTHING;

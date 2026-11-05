-- TNPSC Group IIA Mains syllabus code 583.
-- Kept as a separate DRAFT curriculum; never merge these topics into prelims 495.

INSERT INTO exam(id, code, name, total_questions, metadata)
VALUES (
  'tnpsc-group-2a-mains',
  '583',
  'TNPSC Group IIA Main Examination',
  200,
  '{"source":"Official TNPSC Group IIA Mains syllabus code 583 dated 04.07.2025"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  code=EXCLUDED.code,
  name=EXCLUDED.name,
  total_questions=EXCLUDED.total_questions,
  metadata=EXCLUDED.metadata,
  updated_at=now();

INSERT INTO curriculum(id, exam_id, name, version, status, metadata)
VALUES (
  'tnpsc-group-2a-mains-583',
  'tnpsc-group-2a-mains',
  'TNPSC Group IIA Mains Curriculum',
  '2025.07',
  'DRAFT',
  '{"source_syllabus":"content/syllabus/mains-583.yaml","publication_requires_admin_approval":true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name,
  version=EXCLUDED.version,
  metadata=EXCLUDED.metadata,
  updated_at=now();

INSERT INTO curriculum_section(id, curriculum_id, code, name, sort_order)
VALUES
  ('tnpsc583.general-studies','tnpsc-group-2a-mains-583','GS','General Studies',1),
  ('tnpsc583.general-intelligence','tnpsc-group-2a-mains-583','GI','General Intelligence and Reasoning',2)
ON CONFLICT (id) DO UPDATE SET
  curriculum_id=EXCLUDED.curriculum_id,
  code=EXCLUDED.code,
  name=EXCLUDED.name,
  sort_order=EXCLUDED.sort_order;

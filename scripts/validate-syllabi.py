from pathlib import Path
import sys
import yaml

root = Path(__file__).resolve().parents[1]
syllabus_dir = root / "content" / "syllabus"
files = sorted(syllabus_dir.glob("*.yaml"))
if not files:
    raise SystemExit("FAIL: no syllabus YAML files found")

all_topic_ids = set()
errors = []
reports = []

for path in files:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    exam_id = data.get("exam")
    code = data.get("code")
    subjects = data.get("subjects") or []
    chapters = [chapter for subject in subjects for chapter in subject.get("chapters", [])]
    topics = [topic for chapter in chapters for topic in (chapter.get("topics") or [])]

    for chapter in chapters:
        if not chapter.get("transcribed", False):
            errors.append(f"{path.name}: chapter not marked transcribed: {chapter.get('id')}")
        if not chapter.get("topics"):
            errors.append(f"{path.name}: chapter has no topics: {chapter.get('id')}")
        if sum(1 for topic in chapter.get("topics", []) if not topic.get("id") or not topic.get("name")):
            errors.append(f"{path.name}: invalid topic in chapter: {chapter.get('id')}")

    for topic in topics:
        topic_id = topic.get("id")
        if topic_id in all_topic_ids:
            errors.append(f"duplicate topic id across curricula: {topic_id}")
        all_topic_ids.add(topic_id)

    if path.name == "prelims-495.yaml":
        gs_and_aptitude = sum(
            chapter.get("question_count", 0)
            for subject in subjects
            if subject.get("id") not in {"language-en", "language-ta"}
            for chapter in subject.get("chapters", [])
        )
        language_tracks = [
            sum(chapter.get("question_count", 0) for chapter in subject.get("chapters", []))
            for subject in subjects
            if subject.get("id") in {"language-en", "language-ta"}
        ]
        weighted_questions = gs_and_aptitude + (max(language_tracks) if language_tracks else 0)
    else:
        weighted_questions = sum(chapter.get("question_count", 0) for chapter in chapters)

    if weighted_questions != data.get("total_questions"):
        errors.append(
            f"{path.name}: weighted question total {weighted_questions} != declared {data.get('total_questions')}"
        )

    reports.append({
        "file": path.name,
        "code": code,
        "exam": exam_id,
        "subjects": len(subjects),
        "chapters": len(chapters),
        "topics": len(topics),
        "weighted_questions": weighted_questions,
    })

if errors:
    print("\n".join("FAIL: " + error for error in errors))
    raise SystemExit(1)

for report in reports:
    print(
        f"PASS {report['file']}: code={report['code']} "
        f"subjects={report['subjects']} chapters={report['chapters']} "
        f"topics={report['topics']} questions={report['weighted_questions']}"
    )
print(f"PASS all {len(reports)} curriculum files; {len(all_topic_ids)} globally unique topic IDs")

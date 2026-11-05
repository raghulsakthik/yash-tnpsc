from __future__ import annotations

import json
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
SYLLABUS_DIR = ROOT / "content" / "syllabus"
OUTPUT = ROOT / "content" / "syllabus" / "platform-manifest.json"


def main() -> None:
    curricula = []
    nodes = []
    for path in sorted(SYLLABUS_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        curriculum_id = data["curriculum_id"]
        stage = data.get("exam_stage", "PRELIMS")
        curricula.append({
            "id": curriculum_id,
            "exam_code": f'{data.get("exam_group", "TNPSC")}_{stage}_{data["code"]}',
            "source_reference": data["source_reference"],
            "effective_from": str(data["dated"]),
            "status": data.get("status", "DRAFT").lower(),
        })

        for subject in data.get("subjects", []):
            subject_id = subject["id"]
            subject_language = subject.get("language")
            subject_name = subject["name"]
            nodes.append({
                "id": subject_id,
                "curriculum_version_id": curriculum_id,
                "node_type": "subject",
                "canonical_key": subject_id,
                "title_en": "General Tamil" if subject_language == "ta" else subject_name,
                "title_ta": subject_name if subject_language == "ta" else None,
                "parent_id": None,
                "aliases": [],
                "sort_order": subject.get("sort_order", 0),
            })
            for chapter in subject.get("chapters", []):
                chapter_id = chapter["id"]
                nodes.append({
                    "id": chapter_id,
                    "curriculum_version_id": curriculum_id,
                    "node_type": "unit",
                    "canonical_key": chapter_id,
                    "title_en": chapter["name"],
                    "title_ta": None,
                    "parent_id": subject_id,
                    "aliases": [],
                    "sort_order": chapter.get("sort_order", 0),
                })
                for index, topic in enumerate(chapter.get("topics", []), 1):
                    nodes.append({
                        "id": topic["id"],
                        "curriculum_version_id": curriculum_id,
                        "node_type": "topic",
                        "canonical_key": topic["id"],
                        "title_en": topic["name"],
                        "title_ta": topic.get("name_ta"),
                        "parent_id": chapter_id,
                        "aliases": list(topic.get("aliases") or []),
                        "sort_order": index * 10,
                    })

    ids = [node["id"] for node in nodes]
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate node IDs across syllabus files")
    topic_ids = {node["id"] for node in nodes if node["node_type"] == "topic"}
    parent_ids = {node["id"] for node in nodes}
    for node in nodes:
        if node["parent_id"] and node["parent_id"] not in parent_ids:
            raise SystemExit(f"missing parent for {node['id']}: {node['parent_id']}")
    manifest = {
        "schema_version": 1,
        "source": "Generated from content/syllabus/*.yaml; platform YAML is canonical",
        "curricula": curricula,
        "nodes": nodes,
        "topic_ids": sorted(topic_ids),
    }
    OUTPUT.write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(
        f"EXPORTED curricula={len(curricula)} nodes={len(nodes)} "
        f"topics={len(topic_ids)} output={OUTPUT}"
    )


if __name__ == "__main__":
    main()

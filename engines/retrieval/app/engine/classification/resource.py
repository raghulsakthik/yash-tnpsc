from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
import re
import unicodedata
from typing import Any

import yaml


@dataclass(frozen=True)
class Classification:
    exam: str | None
    group_name: str | None
    exam_stage: str | None
    resource_type: str
    content_kind: str
    subject: str | None
    subject_id: str | None
    chapter_id: str | None
    topic_id: str | None
    language: str | None
    curriculum_id: str | None
    mapping_status: str
    review_required: bool
    confidence: float
    reasons: tuple[str, ...]
    topic_candidates: tuple[str, ...] = ()


_TOPIC_ALIASES: dict[str, tuple[str, ...]] = {
    "aptitude.whole-numbers": ("whole numbers", "place value"),
    "aptitude.division": ("division",),
    "aptitude.fractions": ("fractions",),
    "aptitude.decimals": ("decimals",),
    "aptitude.simplification": ("simplification",),
    "aptitude.percentage": ("percentage", "percentages"),
    "aptitude.hcf": ("hcf", "highest common factor"),
    "aptitude.lcm": ("lcm", "lowest common multiple"),
    "aptitude.ratio-and-proportion": ("ratio and proportion", "ratios and proportions"),
    "aptitude.simple-interest": ("simple interest",),
    "aptitude.compound-interest": ("compound interest",),
    "aptitude.area": ("area", "areas of plane figures"),
    "aptitude.volume": ("volume",),
    "aptitude.time-and-work": ("time and work",),
    "aptitude.profit-and-loss": ("profit and loss",),
    "aptitude.average": ("average", "averages"),
    "aptitude.speed-time-distance": ("speed time and distance", "speed, time and distance"),
    "aptitude.ages": ("problems on ages", "problems involving ages"),
    "reasoning.logical": ("logical reasoning",),
    "reasoning.puzzles": ("puzzles",),
    "reasoning.dice": ("dice",),
    "reasoning.visual": ("visual reasoning",),
    "reasoning.alpha-numeric": ("alpha numeric reasoning", "alphanumeric reasoning"),
    "reasoning.number-series": ("number series",),
    "polity.constitution-preamble": ("preamble to the constitution", "constitution preamble"),
    "polity.salient-features": ("salient features of the constitution",),
    "polity.union-state-ut": ("union state and union territory", "union states and union territories"),
    "polity.citizenship": ("citizenship",),
    "polity.fundamental-rights": ("fundamental rights",),
    "polity.fundamental-duties": ("fundamental duties",),
    "polity.directive-principles": ("directive principles of state policy", "directive principles"),
    "polity.union-executive": ("union executive",),
    "polity.union-legislature": ("union legislature",),
    "polity.state-executive": ("state executive",),
    "polity.state-legislature": ("state legislature",),
    "polity.local-government": ("local governments and panchayat raj", "panchayat raj"),
    "polity.federalism": ("spirit of federalism", "centre state relationships", "center state relations"),
    "polity.elections": ("elections",),
    "polity.judiciary": ("judiciary in india and rule of law", "judiciary"),
    "polity.corruption-anti-corruption": ("corruption in public life", "lokpal and lok ayukta"),
    "polity.right-to-information": ("right to information", "rti"),
    "polity.women-empowerment": ("empowerment of women", "women empowerment"),
    "polity.consumer-human-rights": ("consumer protection forums", "human rights charter"),
    "polity.parties-political-system": ("political parties and political system in india",),
}


def _normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "").casefold()
    value = re.sub(r"[_-]+", " ", value)
    value = re.sub(r"[^\w\u0B80-\u0BFF]+", " ", value, flags=re.UNICODE)
    return " ".join(value.split())


def _contains_phrase(haystack: str, phrase: str) -> bool:
    needle = _normalize(phrase)
    if not needle:
        return False
    return f" {needle} " in f" {_normalize(haystack)} "


class ResourceClassifier:
    """Conservative TNPSC resource and syllabus classifier.

    Exact syllabus mapping is preferred over fuzzy guesses. A document that
    spans several topics, belongs to an unsupported exam stage, or lacks
    enough evidence is returned for review rather than auto-labelled.
    """

    def __init__(self, syllabus_path: str | Path | None = None) -> None:
        syllabus_dir = Path(__file__).resolve().parents[5] / "content" / "syllabus"
        if syllabus_path is None:
            self.syllabus_path = syllabus_dir / "prelims-495.yaml"
            self.syllabus_paths = (
                self.syllabus_path,
                syllabus_dir / "mains-583.yaml",
            )
        else:
            self.syllabus_path = Path(syllabus_path)
            self.syllabus_paths = (self.syllabus_path,)
        self.taxonomy: dict[str, Any] = {}
        self.taxonomies: dict[str, dict[str, Any]] = {}
        self.subjects: list[dict[str, Any]] = []
        self.chapters: list[dict[str, Any]] = []
        self.topics: list[dict[str, Any]] = []
        self._load_taxonomy()
        self.prelims_curriculum_id = next(
            (key for key, value in self.taxonomies.items() if value.get("exam_stage") == "PRELIMS"),
            "tnpsc-prelims-495",
        )
        self.mains_curriculum_id = next(
            (key for key, value in self.taxonomies.items()
             if value.get("exam_stage") == "MAINS" and value.get("exam_group") == "TNPSC_GROUP_2A"),
            None,
        )

    def _load_taxonomy(self) -> None:
        for syllabus_file in self.syllabus_paths:
            if not syllabus_file.is_file():
                continue
            loaded = yaml.safe_load(syllabus_file.read_text(encoding="utf-8")) or {}
            curriculum_id = loaded.get("curriculum_id") or loaded.get("exam") or syllabus_file.stem
            self.taxonomies[curriculum_id] = loaded
            if not self.taxonomy:
                self.taxonomy = loaded
            for subject in loaded.get("subjects", []):
                subject_node = dict(subject)
                subject_node["curriculum_id"] = curriculum_id
                self.subjects.append(subject_node)
                for chapter in subject.get("chapters", []):
                    node = dict(chapter)
                    node["curriculum_id"] = curriculum_id
                    node["subject_id"] = subject.get("id")
                    node["subject_name"] = subject.get("name")
                    self.chapters.append(node)
                    for topic in chapter.get("topics", []):
                        item = dict(topic)
                        item["curriculum_id"] = curriculum_id
                        item["chapter_id"] = chapter.get("id")
                        item["subject_id"] = subject.get("id")
                        item["subject_name"] = subject.get("name")
                        self.topics.append(item)

    @staticmethod
    def _topic_aliases(topic: dict[str, Any]) -> tuple[str, ...]:
        topic_id = str(topic.get("id") or "")
        suffix = topic_id.split(".", 1)[-1].replace("-", " ")
        aliases = [str(topic.get("name") or ""), suffix]
        aliases.extend(topic.get("aliases") or ())
        aliases.extend(_TOPIC_ALIASES.get(topic_id, ()))
        return tuple(dict.fromkeys(x for x in aliases if len(_normalize(x)) >= 4 or _normalize(x) in {"hcf", "lcm", "rti"}))

    @staticmethod
    def _has_mcq_structure(text: str) -> bool:
        sample = (text or "")[:50000]
        question_lines = len(re.findall(r"(?m)^\s*\d{1,3}\s*[.)]\s+\S", sample))
        option_lines = len(re.findall(r"(?m)^\s*\(?[A-D]\)?[.)]\s*\S", sample))
        return question_lines >= 5 and option_lines >= 10 and option_lines >= question_lines * 2

    @staticmethod
    def _explicit_topic(text: str) -> str | None:
        for line in (text or "").splitlines()[:120]:
            match = re.match(r"^\s*(?:topic|subtopic)\s*[:\-]\s*(.{3,140})$", line, re.I)
            if match:
                return match.group(1).strip()
        return None

    def _match_topic(self, value: str, curriculum_id: str | None = None) -> list[dict[str, Any]]:
        matches = []
        for topic in self.topics:
            if curriculum_id and topic.get("curriculum_id") != curriculum_id:
                continue
            aliases = self._topic_aliases(topic)
            if any(_contains_phrase(value, alias) for alias in aliases):
                matches.append(topic)
        return matches

    def _match_chapter(self, value: str, curriculum_id: str | None = None) -> list[dict[str, Any]]:
        matches = []
        for chapter in self.chapters:
            if curriculum_id and chapter.get("curriculum_id") != curriculum_id:
                continue
            aliases = [chapter.get("name", ""), str(chapter.get("id", "")).split(".", 1)[-1].replace("-", " ")]
            if any(_contains_phrase(value, alias) for alias in aliases if alias):
                matches.append(chapter)
        return matches

    def _match_subject(self, value: str, curriculum_id: str | None = None) -> list[dict[str, Any]]:
        matches = []
        for subject in self.subjects:
            if curriculum_id and subject.get("curriculum_id") != curriculum_id:
                continue
            aliases = [subject.get("name", ""), str(subject.get("id", "")).replace("-", " ")]
            if any(_contains_phrase(value, alias) for alias in aliases if alias):
                matches.append(subject)
        return matches

    def classify(self, title: str, url: str = "", text: str = "") -> dict:
        title = title or ""
        url = url or ""
        text = text or ""
        title_url = f"{title} {url}"
        title_norm = _normalize(title)
        hay = f"{title} {url} {text}"
        norm = _normalize(hay)
        reasons: list[str] = []

        group = None
        if re.search(r"group\s*(?:ii\s*a|2\s*a|iia|2a)", norm):
            group = "TNPSC_GROUP_2A"
            reasons.append("group-2a")
        elif re.search(r"group\s*(?:ii|2)(?!\s*a)", norm):
            group = "TNPSC_GROUP_2"
            reasons.append("group-2")
        exam = "TNPSC" if "tnpsc" in norm or group else None
        if exam:
            reasons.append("tnpsc")

        exam_stage = None
        if re.search(r"\b(?:mains|main examination)\b", norm):
            exam_stage = "MAINS"
            reasons.append("mains-stage")
        elif re.search(r"\b(?:prelims|preliminary examination|preliminary)\b", norm):
            exam_stage = "PRELIMS"
            reasons.append("prelims-stage")

        # Resource kind is based on explicit semantic signals. A .pdf suffix
        # alone is not evidence that a file is TNPSC study material.
        if "current affairs" in norm or "current affair" in norm:
            resource_type, content_kind = "current_affairs", "current_affairs"
            reasons.append("current-affairs")
        elif (
            any(x in norm for x in ("question paper", "question papers", "previous year", "pyq"))
            or (group and exam_stage in {"PRELIMS", "MAINS"} and re.search(r"\b(?:ge|gt)\b", title_norm))
        ):
            resource_type, content_kind = "question_paper", "question_paper"
            reasons.append("question-paper")
        elif any(x in norm for x in ("mock test", "mock exam", "full length test", "full mock")):
            resource_type, content_kind = "mock_test", "mock_test"
            reasons.append("mock-test")
        elif any(x in norm for x in ("mcq", "multiple choice", "question bank")):
            resource_type, content_kind = "mcq", "mcq"
            reasons.append("mcq")
        elif self._has_mcq_structure(text):
            resource_type, content_kind = "mcq", "mcq"
            reasons.append("multiple-choice-question-structure")
        elif "syllabus" in norm:
            resource_type, content_kind = "syllabus", "syllabus"
            reasons.append("syllabus")
        elif any(x in norm for x in ("lesson", "study material", "study materials", "study notes", "revision notes")):
            resource_type, content_kind = "study_material", "lesson" if "lesson" in norm else "study_notes"
            reasons.append("study-material")
        elif re.search(r"\bnotes\b", norm):
            resource_type, content_kind = "study_material", "study_notes"
            reasons.append("notes")
        elif re.search(r"(?im)^\s*subject\s*:", text) and re.search(r"(?im)^\s*topic\s*:", text):
            resource_type, content_kind = "study_material", "study_notes"
            reasons.append("structured-course-material")
        elif "practice questions" in norm or "practice question" in norm:
            resource_type, content_kind = "other", "practice_questions"
            reasons.append("practice-questions-need-question-validation")
        else:
            resource_type, content_kind = "other", "other"

        language = None
        if re.search(r"[\u0B80-\u0BFF]", text) or (re.search(r"\btamil(?:\s+medium)?(?:\s+edition)?\b", title_norm) and not re.search(r"\btamil\s+nadu\b", title_norm)):
            language = "ta"
            reasons.append("language-ta")
        elif re.search(r"\benglish(?:\s+medium)?\b", title_norm):
            language = "en"
            reasons.append("language-en")
        elif resource_type == "question_paper" and exam == "TNPSC" and re.search(r"\bgt\b", title_norm):
            # Official TNPSC paper filenames use GT = General Tamil.
            language = "ta"
            reasons.append("language-ta-from-official-gt-paper-code")
        elif resource_type == "question_paper" and exam == "TNPSC" and re.search(r"\bge\b", title_norm):
            # Official TNPSC paper filenames use GE = General English.
            language = "en"
            reasons.append("language-en-from-official-ge-paper-code")

        if exam_stage == "MAINS":
            curriculum_id = self.mains_curriculum_id if group == "TNPSC_GROUP_2A" else None
        else:
            curriculum_id = self.prelims_curriculum_id if exam and self.prelims_curriculum_id in self.taxonomies else None
        # Without a confirmed exam label, use the prelims taxonomy only to
        # surface candidates; curriculum_id stays unset and review is required.
        match_curriculum_id = curriculum_id or (
            self.prelims_curriculum_id
            if exam_stage != "MAINS" and self.prelims_curriculum_id in self.taxonomies
            else None
        )
        subject_id = chapter_id = topic_id = None
        subject_name = None
        mapping_status = "unresolved"
        topic_candidates: list[str] = []
        confidence = 0.25

        explicit = self._explicit_topic(text)
        topic_matches: list[dict[str, Any]] = []
        if match_curriculum_id:
            if explicit:
                topic_matches = self._match_topic(explicit, match_curriculum_id)
                if topic_matches:
                    reasons.append("explicit-topic-heading")
            if not topic_matches:
                topic_matches = self._match_topic(title_url, match_curriculum_id)
                if topic_matches:
                    reasons.append("title-topic-match")
            if not topic_matches and text and resource_type != "current_affairs":
                # Body-only matching is useful for focused notes, but broad
                # current-affairs articles mention many syllabus terms in
                # passing. Do not turn incidental words into topic candidates.
                topic_matches = self._match_topic(text[:12000], match_curriculum_id)
                if topic_matches:
                    reasons.append("body-topic-match")

        unique_topic_ids = list(dict.fromkeys(x.get("id") for x in topic_matches if x.get("id")))
        topic_candidates = unique_topic_ids
        if len(unique_topic_ids) == 1:
            selected = next(x for x in topic_matches if x.get("id") == unique_topic_ids[0])
            topic_id = selected["id"]
            chapter_id = selected["chapter_id"]
            subject_id = selected["subject_id"]
            subject_name = selected["subject_name"]
            mapping_status = "topic_mapped"
            confidence = 0.99 if explicit else 0.90
        elif len(unique_topic_ids) > 1:
            mapping_status = "ambiguous_topics"
            confidence = 0.40
            reasons.append("multiple-topic-candidates")

        if not topic_id and mapping_status not in {"ambiguous_topics"} and match_curriculum_id:
            chapter_value = f"{title_url} {explicit or ''}"
            chapter_matches = self._match_chapter(chapter_value, match_curriculum_id)
            chapter_ids = list(dict.fromkeys(x.get("id") for x in chapter_matches if x.get("id")))
            if len(chapter_ids) == 1:
                selected = next(x for x in chapter_matches if x.get("id") == chapter_ids[0])
                chapter_id = selected["id"]
                subject_id = selected["subject_id"]
                subject_name = selected["subject_name"]
                mapping_status = "chapter_mapped"
                confidence = 0.82
                reasons.append("chapter-match")
            elif len(chapter_ids) > 1:
                mapping_status = "ambiguous_chapters"
                confidence = 0.35
                reasons.append("multiple-chapter-candidates")

        if not topic_id and mapping_status == "unresolved" and match_curriculum_id:
            subject_matches = self._match_subject(title_url, match_curriculum_id)
            subject_ids = list(dict.fromkeys(x.get("id") for x in subject_matches if x.get("id")))
            if len(subject_ids) == 1:
                selected = subject_matches[0]
                subject_id = selected["id"]
                subject_name = selected.get("name")
                mapping_status = "subject_only"
                confidence = 0.65
                reasons.append("subject-match")
            elif len(subject_ids) > 1:
                mapping_status = "ambiguous_subjects"
                confidence = 0.35
                reasons.append("multiple-subject-candidates")

        if resource_type == "current_affairs" and exam and not subject_id and curriculum_id == self.prelims_curriculum_id:
            # Current affairs is supplemental to General Studies in the
            # current prelims course, not a separate canonical syllabus unit.
            subject_id = "general-studies"
            subject_name = "General Studies"
            mapping_status = "subject_only"
            confidence = max(confidence, 0.60)
            reasons.append("current-affairs-supplement-to-general-studies")

        if exam_stage == "MAINS" and not curriculum_id:
            mapping_status = "out_of_curriculum"
            confidence = 0.20
            reasons.append("mains-curriculum-not-configured")
        elif exam_stage == "MAINS" and curriculum_id and mapping_status == "unresolved":
            mapping_status = "mains_topic_unmapped"
            reasons.append("mains-topic-not-found-in-canonical-taxonomy")

        if not exam:
            reasons.append("exam-not-confirmed")
        if mapping_status != "topic_mapped":
            reasons.append("human-review-required")

        review_required = (
            exam is None
            or curriculum_id is None
            or mapping_status != "topic_mapped"
            or confidence < 0.85
            or resource_type == "other"
        )

        return asdict(Classification(
            exam=exam,
            group_name=group,
            exam_stage=exam_stage,
            resource_type=resource_type,
            content_kind=content_kind,
            subject=subject_name,
            subject_id=subject_id,
            chapter_id=chapter_id,
            topic_id=topic_id,
            language=language,
            curriculum_id=curriculum_id,
            mapping_status=mapping_status,
            review_required=review_required,
            confidence=round(confidence, 2),
            reasons=tuple(dict.fromkeys(reasons)),
            topic_candidates=tuple(topic_candidates),
        ))

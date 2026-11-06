import unittest

from app.engine.classification.resource import ResourceClassifier


class ResourceClassifierTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.classifier = ResourceClassifier()

    def test_topic_maps_to_canonical_course_node(self):
        result = self.classifier.classify(
            "TNPSC Group II Fundamental Rights study notes.pdf",
            text="Topic: Fundamental Rights\nThese are constitutional protections."
        )
        self.assertEqual(result["topic_id"], "polity.fundamental-rights")
        self.assertEqual(result["chapter_id"], "gs.indian-polity")
        self.assertEqual(result["subject_id"], "general-studies")
        self.assertEqual(result["mapping_status"], "topic_mapped")
        self.assertFalse(result["review_required"])

    def test_current_affairs_does_not_become_general_english(self):
        result = self.classifier.classify(
            "TNPSC Daily Current Affairs English.pdf"
        )
        self.assertEqual(result["resource_type"], "current_affairs")
        self.assertEqual(result["language"], "en")
        self.assertEqual(result["subject_id"], "general-studies")
        self.assertIsNone(result["topic_id"])
        self.assertTrue(result["review_required"])

    def test_group_iia_mains_maps_to_its_own_curriculum(self):
        result = self.classifier.classify(
            "TNPSC Group IIA Mains Material.pdf",
            text="Subject: Administration of States\nTopic: Union, States and Union Territories"
        )
        self.assertEqual(result["group_name"], "TNPSC_GROUP_2A")
        self.assertEqual(result["exam_stage"], "MAINS")
        self.assertEqual(result["curriculum_id"], "tnpsc-group-2a-mains-583")
        self.assertEqual(result["topic_id"], "mains583.governance.union-state-ut")
        self.assertEqual(result["mapping_status"], "topic_mapped")
        self.assertFalse(result["review_required"])

    def test_group_two_mains_remains_unmapped_without_its_own_syllabus(self):
        result = self.classifier.classify(
            "TNPSC Group II Mains Material.pdf",
            text="Subject: General Studies\nTopic: Constitution"
        )
        self.assertEqual(result["mapping_status"], "out_of_curriculum")
        self.assertIsNone(result["curriculum_id"])
        self.assertTrue(result["review_required"])

    def test_question_paper_type_is_detected(self):
        result = self.classifier.classify("TNPSC Group II 2024 Question Paper.pdf")
        self.assertEqual(result["exam"], "TNPSC")
        self.assertEqual(result["group_name"], "TNPSC_GROUP_2")
        self.assertEqual(result["resource_type"], "question_paper")
        self.assertEqual(result["content_kind"], "question_paper")

    def test_unrelated_pdf_is_not_assumed_to_be_study_material(self):
        result = self.classifier.classify("Unrelated College Assignment.pdf")
        self.assertEqual(result["resource_type"], "other")
        self.assertIsNone(result["exam"])
        self.assertTrue(result["review_required"])

    def test_tamil_nadu_place_name_does_not_imply_tamil_language(self):
        result = self.classifier.classify("TNPSC Tamil Nadu Geography Study Material.pdf")
        self.assertIsNone(result["language"])

    def test_practice_questions_inside_notes_do_not_force_mcq_type(self):
        result = self.classifier.classify(
            "Group IIA Course Chapter.pdf",
            text="Subject: Administration\nTopic: Union States\nPractice Questions: 10"
        )
        self.assertEqual(result["resource_type"], "study_material")
        self.assertEqual(result["content_kind"], "study_notes")

    def test_multiple_topic_matches_are_not_auto_assigned(self):
        result = self.classifier.classify("Percentage and HCF study notes.pdf")
        self.assertEqual(result["mapping_status"], "ambiguous_topics")
        self.assertIsNone(result["topic_id"])
        self.assertTrue(result["review_required"])


    def test_every_canonical_topic_maps_or_is_explicitly_ambiguous(self):
        checked = 0
        for curriculum_id, syllabus in self.classifier.taxonomies.items():
            is_mains = syllabus.get("exam_stage") == "MAINS"
            group = "Group IIA" if syllabus.get("exam_group") == "TNPSC_GROUP_2A" else "Group II"
            stage = "Mains" if is_mains else "Preliminary"
            for subject in syllabus.get("subjects", []):
                for chapter in subject.get("chapters", []):
                    for topic in chapter.get("topics", []):
                        checked += 1
                        result = self.classifier.classify(
                            f"TNPSC {group} {stage} {topic['name']} study notes.pdf",
                            text=f"Topic: {topic['name']}\nCanonical course material for {topic['name']}."
                        )
                        self.assertEqual(result["curriculum_id"], curriculum_id, topic["id"])
                        exact = result.get("topic_id") == topic["id"]
                        safe_ambiguity = (
                            result.get("mapping_status") == "ambiguous_topics"
                            and topic["id"] in result.get("topic_candidates", ())
                            and result.get("review_required") is True
                        )
                        self.assertTrue(exact or safe_ambiguity, f"{topic['id']}: {result}")
        self.assertEqual(checked, 353)


if __name__ == "__main__":
    unittest.main()

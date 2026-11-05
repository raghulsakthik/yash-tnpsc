import unittest
from pathlib import Path

from app.config.settings import DATA_ROOT
from app.engine.integrity.path_resolver import resolve_resource_path


class ResourcePathResolverTests(unittest.TestCase):
    def test_resolves_legacy_root_by_exact_relative_suffix(self):
        current = DATA_ROOT / "official" / "tn-career-services" / "group-2" / "study-material" / "August 2026 Current Affairs - English.pdf"
        self.assertTrue(current.is_file())
        legacy = "/home/yash/tnpsc-material-engine/data/tnpsc-material/official/tn-career-services/group-2/study-material/August 2026 Current Affairs - English.pdf"
        self.assertEqual(resolve_resource_path(legacy, current.stat().st_size), current.resolve())

    def test_rejects_wrong_size(self):
        current = DATA_ROOT / "official" / "tn-career-services" / "group-2" / "study-material" / "August 2026 Current Affairs - English.pdf"
        legacy = "/home/yash/tnpsc-material-engine/data/tnpsc-material/official/tn-career-services/group-2/study-material/August 2026 Current Affairs - English.pdf"
        self.assertIsNone(resolve_resource_path(legacy, current.stat().st_size + 1))

    def test_missing_path_returns_none(self):
        self.assertIsNone(resolve_resource_path("/not/a/real/file.pdf"))


if __name__ == "__main__":
    unittest.main()

import subprocess
import sys
from pathlib import Path
import unittest

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "policy_lawyer.py"
SKILL_DIR = SCRIPT_PATH.resolve().parents[1]


def run_cli(args):
    return subprocess.run(
        [sys.executable, str(SCRIPT_PATH)] + args,
        capture_output=True,
        text=True,
        cwd=SKILL_DIR,
    )


class PolicyLawyerTests(unittest.TestCase):
    def test_list_topics_shows_headers(self):
        result = run_cli(["--list-topics"])
        self.assertEqual(result.returncode, 0)
        self.assertIn("Tone & voice", result.stdout)
        self.assertIn("Security & data hygiene", result.stdout)

    def test_topic_matches_case_insensitive(self):
        result = run_cli(["--topic", "tone"])
        self.assertEqual(result.returncode, 0)
        self.assertIn("## Tone & voice", result.stdout)
        self.assertIn("Stay friendly", result.stdout)

    def test_keyword_search_returns_sections(self):
        result = run_cli(["--keyword", "security"])
        self.assertEqual(result.returncode, 0)
        self.assertIn("Security & data hygiene", result.stdout)
        self.assertIn("Security is paramount", result.stdout)


if __name__ == "__main__":
    unittest.main()

import subprocess
import sys
import tempfile
from pathlib import Path
import unittest

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "context_onboarding.py"


def run_workspace(args, workspace):
    return subprocess.run(
        [sys.executable, str(SCRIPT_PATH)] + args,
        capture_output=True,
        text=True,
        cwd=workspace,
    )


class ContextOnboardingTests(unittest.TestCase):
    def test_summaries_default_documents(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            workspace = Path(tmpdir)
            (workspace / "SOUL.md").write_text("Clawdy is friendly.", encoding="utf-8")
            (workspace / "USER.md").write_text("User prefers short answers.", encoding="utf-8")
            (workspace / "AGENTS.md").write_text("Agent rules: stay calm.", encoding="utf-8")
            (workspace / "TOOLS.md").write_text("Tools: git, clawhub.", encoding="utf-8")

            result = run_workspace([], workspace)
            self.assertEqual(result.returncode, 0)
            self.assertIn("SOUL.md", result.stdout)
            self.assertIn("Clawdy is friendly.", result.stdout)
            self.assertIn("TOOLS.md", result.stdout)

    def test_brief_flag_limits_to_one_line(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            workspace = Path(tmpdir)
            (workspace / "SOUL.md").write_text("Clawdy is friendly.\nSecond line.", encoding="utf-8")

            result = run_workspace(["--brief"], workspace)
            self.assertEqual(result.returncode, 0)
            self.assertIn("Clawdy is friendly.", result.stdout)
            self.assertNotIn("Second line", result.stdout)


if __name__ == "__main__":
    unittest.main()

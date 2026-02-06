import subprocess
import sys
import tempfile
from pathlib import Path
import unittest

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "ops_dashboard.py"


def run_cli(args, workspace):
    return subprocess.run(
        [sys.executable, str(SCRIPT_PATH)] + args,
        capture_output=True,
        text=True,
        cwd=workspace,
    )


class OpsDashboardTests(unittest.TestCase):
    def test_summary_detects_missing_git_repo(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = run_cli(["--workspace", tmpdir, "--show", "summary"], tmpdir)
            self.assertEqual(result.returncode, 0)
            self.assertIn("Not a git repository", result.stdout)

    def test_resources_prints_load_and_commits(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = run_cli(["--workspace", tmpdir, "--show", "resources"], tmpdir)
            self.assertEqual(result.returncode, 0)
            self.assertIn("Load averages", result.stdout)
            self.assertIn("Recent commits", result.stdout)


if __name__ == "__main__":
    unittest.main()

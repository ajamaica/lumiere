import json
import subprocess
import sys
import tempfile
from pathlib import Path
import unittest

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "collaboration_helper.py"


def run_cli(data_path: Path, args):
    return subprocess.run(
        [sys.executable, str(SCRIPT_PATH), "--data", str(data_path)] + args,
        capture_output=True,
        text=True,
    )


class CollaborationHelperTests(unittest.TestCase):
    def test_add_list_complete_flow(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "tasks.json"

            create = run_cli(
                data_file,
                [
                    "add",
                    "Coordinate release notes",
                    "--owner",
                    "ops",
                    "--priority",
                    "high",
                    "--note",
                    "Draft in memory before publishing",
                ],
            )
            self.assertEqual(create.returncode, 0)
            self.assertIn("Created task", create.stdout)

            tasks = json.loads(data_file.read_text(encoding="utf-8"))
            task_id = tasks[-1]["id"]
            self.assertEqual(tasks[-1]["owner"], "ops")

            listed = run_cli(data_file, ["list"])  # default list
            self.assertEqual(listed.returncode, 0)
            self.assertIn("Coordinate release notes", listed.stdout)

            completed = run_cli(data_file, ["complete", str(task_id)])
            self.assertEqual(completed.returncode, 0)
            self.assertIn("marked done", completed.stdout)

            tasks = json.loads(data_file.read_text(encoding="utf-8"))
            self.assertEqual(tasks[-1]["status"], "done")


if __name__ == "__main__":
    unittest.main()

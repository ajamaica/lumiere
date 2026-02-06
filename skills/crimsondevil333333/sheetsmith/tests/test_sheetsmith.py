import csv
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
import unittest

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "sheetsmith.py"
SAMPLE_DATA = Path(__file__).resolve().parents[1] / "tests" / "data" / "test.csv"


def run_cli(args, workspace):
    return subprocess.run(
        [sys.executable, str(SCRIPT_PATH)] + args,
        capture_output=True,
        text=True,
        cwd=workspace,
    )


class SheetsmithTests(unittest.TestCase):
    def test_summary_outputs_shape_and_preview(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            workspace = Path(tmpdir)
            dest = workspace / "data.csv"
            shutil.copy2(SAMPLE_DATA, dest)

            result = run_cli(["summary", str(dest), "--rows", "2"], workspace)
            self.assertEqual(result.returncode, 0)
            self.assertIn("Shape:", result.stdout)
            self.assertIn("Preview:", result.stdout)

    def test_filter_and_transform_write_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            workspace = Path(tmpdir)
            source = workspace / "data.csv"
            shutil.copy2(SAMPLE_DATA, source)

            filtered = workspace / "filtered.csv"
            result = run_cli([
                "filter",
                str(source),
                "--query",
                "state == 'CA'",
                "--output",
                str(filtered),
            ], workspace)
            self.assertEqual(result.returncode, 0)
            self.assertTrue(filtered.exists())
            with open(filtered, newline="", encoding="utf-8") as stream:
                reader = list(csv.DictReader(stream))
                self.assertEqual(len(reader), 2)

            transformed = workspace / "with-density.csv"
            result = run_cli([
                "transform",
                str(filtered),
                "--expr",
                "density = population / area",
                "--output",
                str(transformed),
            ], workspace)
            self.assertEqual(result.returncode, 0)
            with open(transformed, newline="", encoding="utf-8") as stream:
                reader = csv.DictReader(stream)
                self.assertIn("density", reader.fieldnames)
                rows = list(reader)
                self.assertTrue(all(float(row["density"]) > 0 for row in rows))


if __name__ == "__main__":
    unittest.main()

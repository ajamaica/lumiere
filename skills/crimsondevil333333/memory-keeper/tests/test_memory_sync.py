import contextlib
import io
import importlib.util
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "memory_sync.py"
SPEC = importlib.util.spec_from_file_location("memory_sync", SCRIPT_PATH)
memory_sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(memory_sync)


class MemorySyncTests(unittest.TestCase):
    def test_copy_files_includes_defaults_and_memory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            workspace = Path(tmpdir) / "workspace"
            workspace.mkdir()
            for name in memory_sync.DEFAULT_FILES:
                (workspace / name).write_text(f"content for {name}", encoding="utf-8")
            memory_dir = workspace / "memory"
            memory_dir.mkdir()
            (memory_dir / "session.md").write_text("session", encoding="utf-8")

            target = Path(tmpdir) / "archive"
            memory_sync.copy_files(workspace, target, include_memory=True)

            for name in memory_sync.DEFAULT_FILES:
                self.assertTrue((target / name).exists(), f"{name} was not copied")
            self.assertTrue((target / "memory" / "session.md").exists())

    def test_log_memory_update_writes_entry_with_timestamp(self):
        timestamp = datetime(2026, 2, 3, 12, 0)
        with tempfile.TemporaryDirectory() as tmpdir:
            workspace = Path(tmpdir)
            target = Path(tmpdir) / "dest"
            target.mkdir()

            memory_sync.log_memory_update(
                workspace,
                target,
                commit=True,
                push=False,
                remote="https://example.com/repo.git",
                timestamp=timestamp,
            )

            log_file = workspace / "memory" / "2026-02-03.md"
            self.assertTrue(log_file.exists())
            contents = log_file.read_text(encoding="utf-8")
            self.assertIn("Memory Keeper synced to", contents)
            self.assertIn("commit=True", contents)

    def test_commit_and_push_handles_git_errors(self):
        args = SimpleNamespace(
            message="msg",
            remote="https://example.com/repo.git",
            push=True,
            branch="main",
            commit=True,
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            target = Path(tmpdir) / "archive"
            target.mkdir()
            error = subprocess.CalledProcessError(
                returncode=1,
                cmd=["git", "-C", str(target), "add", "."],
                stderr=b"fatal: Authentication failed",
            )

            with patch.object(memory_sync, "ensure_git_repo"), \
                    patch.object(memory_sync, "configure_remote"), \
                    patch.object(memory_sync, "run_git_command", side_effect=error):
                buffer = io.StringIO()
                with contextlib.redirect_stderr(buffer):
                    result = memory_sync.commit_and_push(target, args)
                self.assertFalse(result)
                self.assertIn("Git command", buffer.getvalue())
                self.assertIn("Authentication failed", buffer.getvalue())


if __name__ == "__main__":
    unittest.main()

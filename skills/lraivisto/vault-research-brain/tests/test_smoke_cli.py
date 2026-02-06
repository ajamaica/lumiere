import os
import subprocess
import sys

def _run_cli(args, env):
    result = subprocess.run(
        [sys.executable, "-m", "scripts.vault", *args],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, f"{result.stdout}\n{result.stderr}"

def test_smoke_init_insight_export(tmp_path):
    db_path = tmp_path / "vault.db"
    output_path = tmp_path / "summary.md"
    env = os.environ.copy()
    env["RESEARCHVAULT_DB"] = str(db_path)

    _run_cli(
        ["init", "--id", "demo-v1", "--name", "Demo", "--objective", "Smoke test"],
        env,
    )
    _run_cli(
        [
            "insight",
            "--id",
            "demo-v1",
            "--add",
            "--title",
            "First Insight",
            "--content",
            "Vault can export findings.",
            "--tags",
            "smoke",
        ],
        env,
    )
    _run_cli(
        [
            "export",
            "--id",
            "demo-v1",
            "--format",
            "markdown",
            "--output",
            str(output_path),
        ],
        env,
    )

    assert output_path.exists()
    assert "Research Vault" in output_path.read_text()


def test_smoke_branch_and_hypothesis(tmp_path):
    db_path = tmp_path / "vault.db"
    output_path = tmp_path / "alt.md"
    env = os.environ.copy()
    env["RESEARCHVAULT_DB"] = str(db_path)

    _run_cli(
        ["init", "--id", "demo-v2", "--name", "Demo 2", "--objective", "Branch smoke test"],
        env,
    )
    _run_cli(
        ["branch", "create", "--id", "demo-v2", "--name", "alt", "--hypothesis", "Try alternative framing"],
        env,
    )
    _run_cli(
        [
            "hypothesis",
            "add",
            "--id",
            "demo-v2",
            "--branch",
            "alt",
            "--statement",
            "The top claim is unverified; corroborate it.",
            "--conf",
            "0.55",
        ],
        env,
    )
    _run_cli(
        [
            "insight",
            "--id",
            "demo-v2",
            "--add",
            "--branch",
            "alt",
            "--title",
            "Alt Insight",
            "--content",
            "Branched insight should be scoped to the alt branch.",
            "--tags",
            "branch",
        ],
        env,
    )
    _run_cli(
        [
            "export",
            "--id",
            "demo-v2",
            "--branch",
            "alt",
            "--format",
            "markdown",
            "--output",
            str(output_path),
        ],
        env,
    )

    text = output_path.read_text()
    assert "Alt Insight" in text

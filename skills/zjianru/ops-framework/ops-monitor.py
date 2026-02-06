#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen


OPENCLAW_HOME = Path(os.environ.get("OPENCLAW_HOME", str(Path.home() / ".openclaw"))).expanduser()
DEFAULT_CONFIG_FILE = OPENCLAW_HOME / "net" / "config" / "ops-jobs.json"
DEFAULT_STATE_FILE = OPENCLAW_HOME / "net" / "state" / "ops-monitor.json"


ALLOWED_KINDS = {"long_running_read", "one_shot_read", "one_shot_write"}
ALLOWED_RISKS = {"read_only", "write_local", "write_external"}


@dataclass(frozen=True)
class QuietHours:
    start: str  # "HH:MM"
    end: str  # "HH:MM"


@dataclass(frozen=True)
class JobDefaults:
    quiet_hours: QuietHours
    report_every_seconds: int
    stall_seconds: int
    auto_resume: bool
    auto_resume_backoff_seconds: int


@dataclass(frozen=True)
class JobConfig:
    id: str
    name: str
    kind: str
    enabled: bool
    risk: str
    cwd: Path
    commands: dict[str, list[str]]
    policy: dict[str, Any]
    approval: dict[str, Any] | None
    after: list[dict[str, Any]]


@dataclass(frozen=True)
class JobStatus:
    running: bool
    completed: bool
    pid: int | None = None
    stop_reason: str | None = None
    progress: dict[str, Any] | None = None
    progress_key: str | None = None
    level: str | None = None  # ok | warn | alert
    message: str | None = None


def _now_ts() -> float:
    return time.time()


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_json_quiet(path: Path) -> dict[str, Any] | None:
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def atomic_write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")
    tmp.replace(path)


def _parse_hhmm(v: str) -> tuple[int, int] | None:
    if not isinstance(v, str):
        return None
    m = re.match(r"^(?P<h>\d{2}):(?P<m>\d{2})$", v.strip())
    if not m:
        return None
    h = int(m.group("h"))
    mi = int(m.group("m"))
    if not (0 <= h <= 23 and 0 <= mi <= 59):
        return None
    return h, mi


def is_quiet_hours(now_local: datetime, quiet: QuietHours) -> bool:
    """
    Quiet hours can wrap over midnight. Example: 23:00–08:00.
    """
    s = _parse_hhmm(quiet.start)
    e = _parse_hhmm(quiet.end)
    if not s or not e:
        return False
    sh, sm = s
    eh, em = e
    start_min = sh * 60 + sm
    end_min = eh * 60 + em
    cur_min = int(now_local.hour) * 60 + int(now_local.minute)
    if start_min == end_min:
        return False
    if start_min < end_min:
        return start_min <= cur_min < end_min
    # Wrap midnight
    return cur_min >= start_min or cur_min < end_min


def _local_now() -> datetime:
    return datetime.now().astimezone()


def find_default_telegram_target(openclaw_home: Path) -> str | None:
    cfg = load_json_quiet(openclaw_home / "openclaw.json") or {}
    agents = (cfg.get("agents") or {}) if isinstance(cfg, dict) else {}
    lst = agents.get("list") if isinstance(agents, dict) else None
    if isinstance(lst, list):
        for a in lst:
            if not isinstance(a, dict):
                continue
            if a.get("id") != "main":
                continue
            hb = a.get("heartbeat")
            if not isinstance(hb, dict):
                continue
            if hb.get("target") == "telegram":
                to = hb.get("to")
                if isinstance(to, (str, int)) and str(to):
                    return str(to)

    channels = (cfg.get("channels") or {}) if isinstance(cfg, dict) else {}
    tg = channels.get("telegram") if isinstance(channels, dict) else None
    if isinstance(tg, dict):
        allow_from = tg.get("allowFrom")
        if isinstance(allow_from, list) and allow_from:
            v = allow_from[0]
            if isinstance(v, (str, int)) and str(v):
                return str(v)
    return None


def find_openclaw_bin() -> str | None:
    found = shutil.which("openclaw")
    if found:
        return found
    hb = Path("/opt/homebrew/bin/openclaw")
    if hb.is_file():
        return str(hb)
    return None


def send_telegram_via_openclaw(*, openclaw_bin: str, target: str, message: str) -> None:
    subprocess.run(
        [openclaw_bin, "message", "send", "--channel", "telegram", "--target", target, "--message", message],
        check=True,
        capture_output=True,
        text=True,
    )


def send_telegram_direct(*, openclaw_home: Path, target: str, message: str) -> None:
    cfg = load_json_quiet(openclaw_home / "openclaw.json") or {}
    channels = (cfg.get("channels") or {}) if isinstance(cfg, dict) else {}
    tg = channels.get("telegram") if isinstance(channels, dict) else None
    token = tg.get("botToken") if isinstance(tg, dict) else None
    if not isinstance(token, str) or not token:
        raise RuntimeError("telegram.botToken missing; cannot send directly")

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({"chat_id": target, "text": message, "disable_web_page_preview": True}).encode("utf-8")
    req = Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=20) as r:  # noqa: S310
        body = r.read().decode("utf-8", "replace")
        if '"ok":true' not in body and '"ok": true' not in body:
            raise RuntimeError(f"telegram send failed: {body[:200]}")


def send_telegram_best_effort(*, openclaw_home: Path, target: str, message: str) -> None:
    openclaw_bin = find_openclaw_bin()
    if openclaw_bin:
        send_telegram_via_openclaw(openclaw_bin=openclaw_bin, target=target, message=message)
        return
    send_telegram_direct(openclaw_home=openclaw_home, target=target, message=message)


def _tail(s: str, *, max_chars: int = 800) -> str:
    s = s or ""
    s = s.strip()
    if len(s) <= max_chars:
        return s
    return s[-max_chars:]


@dataclass(frozen=True)
class CmdResult:
    exit_code: int
    duration_ms: int
    stdout_tail: str
    stderr_tail: str


def run_cmd(argv: list[str], *, cwd: Path, timeout_seconds: int) -> CmdResult:
    t0 = time.time()
    proc = subprocess.run(  # noqa: S603
        argv,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=int(timeout_seconds),
        check=False,
    )
    dur_ms = int((time.time() - t0) * 1000)
    return CmdResult(
        exit_code=int(proc.returncode),
        duration_ms=dur_ms,
        stdout_tail=_tail(proc.stdout or ""),
        stderr_tail=_tail(proc.stderr or ""),
    )


def _job_defaults_from_config(cfg: dict[str, Any]) -> JobDefaults:
    defaults = cfg.get("defaults") if isinstance(cfg.get("defaults"), dict) else {}
    if not isinstance(defaults, dict):
        defaults = {}
    qh = defaults.get("quietHours") if isinstance(defaults.get("quietHours"), dict) else {}
    if not isinstance(qh, dict):
        qh = {}
    quiet_hours = QuietHours(
        start=str(qh.get("start") or "23:00"),
        end=str(qh.get("end") or "08:00"),
    )
    return JobDefaults(
        quiet_hours=quiet_hours,
        report_every_seconds=int(defaults.get("reportEverySeconds") or 1800),
        stall_seconds=int(defaults.get("stallSeconds") or 3600),
        auto_resume=bool(defaults.get("autoResume") is True),
        auto_resume_backoff_seconds=int(defaults.get("autoResumeBackoffSeconds") or 900),
    )


def _as_argv(v: Any) -> list[str] | None:
    if not isinstance(v, list) or not v:
        return None
    out: list[str] = []
    for x in v:
        if not isinstance(x, str) or not x:
            return None
        out.append(x)
    return out


def load_jobs_config(path: Path) -> tuple[JobDefaults, dict[str, JobConfig]]:
    cfg = load_json_quiet(path) or {}
    if not isinstance(cfg, dict) or int(cfg.get("version") or 0) != 1:
        raise ValueError(f"Invalid config: expected version=1 at {path}")

    defaults = _job_defaults_from_config(cfg)
    raw_jobs = cfg.get("jobs")
    if not isinstance(raw_jobs, list):
        raise ValueError("Invalid config: jobs must be a list")

    jobs: dict[str, JobConfig] = {}
    for idx, raw in enumerate(raw_jobs):
        if not isinstance(raw, dict):
            raise ValueError(f"Invalid job at index {idx}: not an object")
        jid = raw.get("id")
        if not isinstance(jid, str) or not jid.strip():
            raise ValueError(f"Invalid job at index {idx}: missing id")
        jid = jid.strip()
        if jid in jobs:
            raise ValueError(f"Duplicate job id: {jid}")

        name = raw.get("name")
        name = str(name).strip() if isinstance(name, str) and name.strip() else jid

        kind = raw.get("kind")
        if not isinstance(kind, str) or kind not in ALLOWED_KINDS:
            raise ValueError(f"Invalid job {jid}: kind must be one of {sorted(ALLOWED_KINDS)}")

        enabled = bool(raw.get("enabled") is True)

        risk = raw.get("risk")
        if not isinstance(risk, str) or risk not in ALLOWED_RISKS:
            raise ValueError(f"Invalid job {jid}: risk must be one of {sorted(ALLOWED_RISKS)}")

        cwd_raw = raw.get("cwd")
        if cwd_raw is None:
            cwd = OPENCLAW_HOME
        elif isinstance(cwd_raw, str) and cwd_raw.strip():
            cwd = Path(cwd_raw).expanduser()
        else:
            raise ValueError(f"Invalid job {jid}: cwd must be a non-empty string path")

        commands_raw = raw.get("commands")
        if not isinstance(commands_raw, dict):
            raise ValueError(f"Invalid job {jid}: commands must be an object")
        commands: dict[str, list[str]] = {}
        for k, v in commands_raw.items():
            if not isinstance(k, str):
                continue
            argv = _as_argv(v)
            if argv is None:
                raise ValueError(f"Invalid job {jid}: commands.{k} must be a non-empty argv list")
            commands[k] = argv

        policy = raw.get("policy") if isinstance(raw.get("policy"), dict) else {}
        if not isinstance(policy, dict):
            policy = {}

        approval = raw.get("approval") if isinstance(raw.get("approval"), dict) else None
        after = raw.get("after") if isinstance(raw.get("after"), list) else []
        if not isinstance(after, list):
            after = []
        after_norm: list[dict[str, Any]] = []
        for a in after:
            if isinstance(a, dict):
                after_norm.append(dict(a))

        # Per-kind command requirements.
        if kind == "long_running_read":
            if "start" not in commands or "status" not in commands:
                raise ValueError(f"Invalid job {jid}: long_running_read requires commands.start and commands.status")
        elif kind in ("one_shot_read", "one_shot_write"):
            if "run" not in commands:
                raise ValueError(f"Invalid job {jid}: {kind} requires commands.run")

        jobs[jid] = JobConfig(
            id=jid,
            name=name,
            kind=kind,
            enabled=enabled,
            risk=risk,
            cwd=cwd,
            commands=commands,
            policy=policy,
            approval=approval,
            after=after_norm,
        )

    # Cross-job validation: write jobs must have a read verification step.
    for jid, job in jobs.items():
        if job.kind != "one_shot_write":
            continue
        succ = [a for a in job.after if (a.get("when") or "success") == "success"]
        if not succ:
            raise ValueError(f"Invalid job {jid}: one_shot_write requires at least 1 after[when=success] verification job")
        ok = False
        for a in succ:
            nxt = a.get("jobId")
            if not isinstance(nxt, str) or nxt not in jobs:
                continue
            if jobs[nxt].kind in ("one_shot_read", "long_running_read") and jobs[nxt].risk == "read_only":
                ok = True
                break
        if not ok:
            raise ValueError(f"Invalid job {jid}: after[success] must reference a read_only verification job")

    return defaults, jobs


def load_state(path: Path) -> tuple[dict[str, Any], dict[str, Any], list[dict[str, Any]]]:
    state = load_json_quiet(path) or {}
    if not isinstance(state, dict):
        state = {}
    jobs = state.get("jobs") if isinstance(state.get("jobs"), dict) else {}
    if not isinstance(jobs, dict):
        jobs = {}
    queue = state.get("queue") if isinstance(state.get("queue"), list) else []
    if not isinstance(queue, list):
        queue = []
    queue_norm: list[dict[str, Any]] = []
    for x in queue:
        if isinstance(x, dict):
            queue_norm.append(dict(x))
    return state, jobs, queue_norm


def persist_state(path: Path, *, state: dict[str, Any], jobs: dict[str, Any], queue: list[dict[str, Any]]) -> None:
    out = dict(state)
    out["version"] = 1
    out["updatedAt"] = _iso_now()
    out["jobs"] = jobs
    if queue:
        out["queue"] = queue
    elif "queue" in out:
        out.pop("queue", None)
    atomic_write_json(path, out)


def _status_from_json(obj: Any) -> JobStatus:
    if not isinstance(obj, dict):
        raise ValueError("status JSON must be an object")
    running = obj.get("running")
    completed = obj.get("completed")
    if not isinstance(running, bool) or not isinstance(completed, bool):
        raise ValueError("status JSON must include boolean fields: running, completed")
    pid = obj.get("pid")
    pid_i = int(pid) if isinstance(pid, int) and pid > 0 else None
    stop_reason = obj.get("stopReason")
    stop_reason = stop_reason if isinstance(stop_reason, str) and stop_reason.strip() else None
    level = obj.get("level")
    level = level if isinstance(level, str) and level.strip() else None
    message = obj.get("message")
    message = message if isinstance(message, str) and message.strip() else None
    progress = obj.get("progress")
    progress = progress if isinstance(progress, dict) else None
    progress_key = obj.get("progressKey")
    progress_key = progress_key if isinstance(progress_key, str) and progress_key.strip() else None
    if not progress_key and progress is not None:
        try:
            progress_key = json.dumps(progress, sort_keys=True, ensure_ascii=False)
        except Exception:
            progress_key = None
    return JobStatus(
        running=running,
        completed=completed,
        pid=pid_i,
        stop_reason=stop_reason,
        progress=progress,
        progress_key=progress_key,
        level=level,
        message=message,
    )


def run_status_cmd(job: JobConfig, *, timeout_seconds: int = 30) -> JobStatus:
    argv = job.commands.get("status")
    if not argv:
        # Non-long-running jobs may not define status. Treat as not running.
        return JobStatus(running=False, completed=False, message="missing status command")
    proc = subprocess.run(  # noqa: S603
        argv,
        cwd=str(job.cwd),
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
        check=False,
    )
    if proc.returncode != 0:
        stderr_tail = (proc.stderr or "").strip().splitlines()[-1:] or []
        msg = stderr_tail[0] if stderr_tail else f"status exit={proc.returncode}"
        return JobStatus(running=False, completed=False, level="alert", message=msg)
    out = (proc.stdout or "").strip()
    if not out:
        return JobStatus(running=False, completed=False, level="alert", message="empty status output")
    try:
        obj = json.loads(out)
    except Exception:
        return JobStatus(running=False, completed=False, level="alert", message="status output is not JSON")
    return _status_from_json(obj)


def _policy_bool(job: JobConfig, defaults: JobDefaults, key: str) -> bool:
    v = job.policy.get(key) if isinstance(job.policy, dict) else None
    if isinstance(v, bool):
        return v
    if key == "autoResume":
        return bool(defaults.auto_resume)
    if key == "onlyOnChange":
        return True
    if key == "reportWhileRunning":
        return True
    return False


def _policy_int(job: JobConfig, defaults: JobDefaults, key: str) -> int:
    v = job.policy.get(key) if isinstance(job.policy, dict) else None
    if isinstance(v, int) and v >= 0:
        return v
    if key == "reportEverySeconds":
        return int(defaults.report_every_seconds)
    if key == "stallSeconds":
        return int(defaults.stall_seconds)
    if key == "autoResumeBackoffSeconds":
        return int(defaults.auto_resume_backoff_seconds)
    return 0


def _policy_quiet_hours(job: JobConfig, defaults: JobDefaults) -> QuietHours:
    qh = job.policy.get("quietHours") if isinstance(job.policy.get("quietHours"), dict) else None
    if isinstance(qh, dict):
        s = qh.get("start")
        e = qh.get("end")
        if isinstance(s, str) and isinstance(e, str) and _parse_hhmm(s) and _parse_hhmm(e):
            return QuietHours(start=s, end=e)
    return defaults.quiet_hours


def _approval_granted(job: JobConfig) -> bool:
    if job.kind != "one_shot_write":
        return True
    if not isinstance(job.approval, dict):
        return False
    required = bool(job.approval.get("required") is True) if "required" in job.approval else True
    if not required:
        return True
    return bool(job.approval.get("granted") is True)


def enqueue_after_jobs(
    *,
    queue: list[dict[str, Any]],
    parent_job: JobConfig,
    when: str,
    now: float,
    reason: str,
) -> None:
    for a in parent_job.after:
        w = a.get("when") or "success"
        if w != when:
            continue
        jid = a.get("jobId")
        if not isinstance(jid, str) or not jid:
            continue
        delay = a.get("delaySeconds")
        try:
            delay_s = float(delay) if isinstance(delay, (int, float)) else 0.0
        except Exception:
            delay_s = 0.0
        queue.append(
            {
                "id": str(uuid.uuid4()),
                "jobId": jid,
                "createdAt": float(now),
                "notBefore": float(now + max(0.0, delay_s)),
                "reason": str(reason),
                "status": "pending",
                "attempt": 0,
            }
        )


def maybe_autorun_start(
    *,
    job: JobConfig,
    status: JobStatus,
    now: float,
    state_job: dict[str, Any],
    defaults: JobDefaults,
    dry_run: bool,
) -> str | None:
    if job.kind != "long_running_read":
        return None
    if not job.enabled:
        return None
    if job.risk != "read_only":
        return "AUTORUN: blocked (risk != read_only)"
    if status.running or status.completed:
        return None
    if not _policy_bool(job, defaults, "autoResume"):
        return None

    last = state_job.get("lastAutoResumeAt")
    try:
        last_ts = float(last) if isinstance(last, (int, float)) else 0.0
    except Exception:
        last_ts = 0.0
    backoff = float(_policy_int(job, defaults, "autoResumeBackoffSeconds") or 0)
    if backoff and now - last_ts < backoff:
        return "AUTORUN: suppressed (backoff)"

    argv = job.commands.get("start")
    if not argv:
        return "AUTORUN: missing start command"

    state_job["lastAutoResumeAt"] = float(now)
    if dry_run:
        return "AUTORUN: would start (dry-run)"

    try:
        proc = subprocess.run(  # noqa: S603
            argv,
            cwd=str(job.cwd),
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
        if proc.returncode != 0:
            return f"AUTORUN: start failed (exit={proc.returncode})"
        return "AUTORUN: started"
    except subprocess.TimeoutExpired:
        return "AUTORUN: start timeout"
    except Exception:
        return "AUTORUN: start error"


def should_report(
    *,
    job: JobConfig,
    status: JobStatus,
    anomaly_key: str | None,
    now: float,
    state_job: dict[str, Any],
    defaults: JobDefaults,
    anomaly: bool,
    autorun_note: str | None,
) -> bool:
    last_seen = state_job.get("lastSeen") if isinstance(state_job.get("lastSeen"), dict) else {}
    prev_running = bool(last_seen.get("running") is True)
    prev_completed = bool(last_seen.get("completed") is True)
    prev_progress = last_seen.get("progressKey")
    prev_progress = prev_progress if isinstance(prev_progress, str) else None
    status_changed = (status.running != prev_running) or (status.completed != prev_completed)
    progress_changed = bool(status.progress_key and status.progress_key != prev_progress)

    last_report = state_job.get("lastReportAt")
    try:
        last_report_ts = float(last_report) if isinstance(last_report, (int, float)) else 0.0
    except Exception:
        last_report_ts = 0.0
    report_every = float(_policy_int(job, defaults, "reportEverySeconds") or 0)

    if autorun_note:
        return True
    if anomaly:
        last_key = state_job.get("lastAnomalyKey")
        last_key = last_key if isinstance(last_key, str) and last_key.strip() else None
        last_report = state_job.get("lastAnomalyReportAt")
        try:
            last_report_ts = float(last_report) if isinstance(last_report, (int, float)) else 0.0
        except Exception:
            last_report_ts = 0.0

        # Report immediately when a new anomaly appears or changes.
        if anomaly_key and anomaly_key != last_key:
            return True
        # Otherwise, avoid spamming; re-notify only with a coarse backoff.
        backoff = max(900.0, float(report_every or 0.0))  # default 15m
        if last_report_ts and (now - last_report_ts) < backoff:
            return False
        return True
    if status_changed:
        return True
    if status.completed and not bool(state_job.get("reportedCompleted") is True):
        return True
    if status.running and _policy_bool(job, defaults, "reportWhileRunning"):
        if report_every and now - last_report_ts >= report_every:
            return True
        if progress_changed and _policy_bool(job, defaults, "onlyOnChange"):
            return True
    return False


def build_section(job: JobConfig, status: JobStatus, *, anomaly: bool, autorun_note: str | None) -> str:
    lines: list[str] = []
    lines.append(f"• {job.name} ({job.id}, {job.kind})")
    if status.completed:
        lines.append("- 状态: completed ✅")
    elif status.running:
        pid_part = f" (pid={status.pid})" if status.pid else ""
        lines.append(f"- 状态: running{pid_part}")
    else:
        reason = f" stopReason={status.stop_reason}" if status.stop_reason else ""
        lines.append(f"- 状态: paused{reason}")

    if status.message:
        lines.append(f"- 信息: {status.message}")
    if status.progress:
        # Keep it short; include only a few keys.
        keys = sorted(status.progress.keys())
        shown = keys[:6]
        parts: list[str] = []
        for k in shown:
            v = status.progress.get(k)
            if isinstance(v, (str, int, float, bool)) or v is None:
                parts.append(f"{k}={v}")
        if parts:
            lines.append("- 进度: " + " | ".join(parts))
    if anomaly and not status.completed:
        lines.append("- ACTION REQUIRED: 需要你确认下一步（或启用 autoResume）")
    if autorun_note:
        lines.append(f"- {autorun_note}")
    return "\n".join(lines)


def run_one_shot_read(
    *,
    job: JobConfig,
    now: float,
    state_job: dict[str, Any],
    timeout_seconds: int,
    dry_run: bool,
) -> CmdResult:
    if job.kind != "one_shot_read":
        raise ValueError("run_one_shot_read requires kind=one_shot_read")
    if job.risk != "read_only":
        raise ValueError("one_shot_read job risk must be read_only")
    argv = job.commands.get("run")
    if not argv:
        raise ValueError("missing commands.run")
    if dry_run:
        res = CmdResult(exit_code=0, duration_ms=0, stdout_tail="(dry-run)", stderr_tail="")
    else:
        res = run_cmd(argv, cwd=job.cwd, timeout_seconds=timeout_seconds)
    state_job["lastRunAt"] = float(now)
    state_job["lastRun"] = {
        "exitCode": int(res.exit_code),
        "durationMs": int(res.duration_ms),
        "stdoutTail": res.stdout_tail,
        "stderrTail": res.stderr_tail,
    }
    return res


def tick(
    *,
    config_path: Path,
    state_path: Path,
    target: str | None,
    print_only: bool,
    dry_run: bool,
) -> int:
    now = _now_ts()
    now_local = _local_now()
    state, state_jobs, queue = load_state(state_path)

    sections: list[str] = []
    try:
        defaults, jobs = load_jobs_config(config_path)
    except Exception as e:
        # Config errors are actionable; report with backoff to avoid spam.
        last = state.get("lastConfigErrorAt")
        try:
            last_ts = float(last) if isinstance(last, (int, float)) else 0.0
        except Exception:
            last_ts = 0.0
        if now - last_ts >= 3600:
            state["lastConfigErrorAt"] = float(now)
            msg = f"🛠️ Ops 快报\n\n• ALERT: ops-jobs config invalid\n- path: {config_path}\n- error: {e}"
            if print_only:
                print(msg)
            else:
                tg = target or find_default_telegram_target(OPENCLAW_HOME)
                if tg:
                    send_telegram_best_effort(openclaw_home=OPENCLAW_HOME, target=tg, message=msg)
        persist_state(path=state_path, state=state, jobs=state_jobs, queue=queue)
        return 2

    # Process queued one-shot read tasks (e.g., post-write verification). Only read-only jobs may run.
    if queue:
        new_queue: list[dict[str, Any]] = []
        for item in queue:
            status = item.get("status") or "pending"
            if status not in ("pending", "running"):
                new_queue.append(item)
                continue
            nb = item.get("notBefore")
            try:
                not_before = float(nb) if isinstance(nb, (int, float)) else 0.0
            except Exception:
                not_before = 0.0
            if not_before and now < not_before:
                new_queue.append(item)
                continue
            jid = item.get("jobId")
            if not isinstance(jid, str) or jid not in jobs:
                item["status"] = "blocked"
                item["lastError"] = "unknown jobId"
                sections.append(f"• ALERT: queued job missing\n- jobId: {jid}")
                new_queue.append(item)
                continue
            job = jobs[jid]
            sj = state_jobs.get(jid)
            if not isinstance(sj, dict):
                sj = {}
                state_jobs[jid] = sj

            if job.kind != "one_shot_read" or job.risk != "read_only":
                item["status"] = "blocked"
                item["lastError"] = f"blocked kind={job.kind} risk={job.risk}"
                sections.append(f"• ACTION REQUIRED: queued job blocked\n- job: {job.id} ({job.kind}, {job.risk})")
                new_queue.append(item)
                continue

            # Execute read-only job.
            item["status"] = "running"
            item["attempt"] = int(item.get("attempt") or 0) + 1
            item["lastRunAt"] = float(now)
            try:
                res = run_one_shot_read(
                    job=job,
                    now=now,
                    state_job=sj,
                    timeout_seconds=int(item.get("timeoutSeconds") or 300),
                    dry_run=dry_run,
                )
                item["exitCode"] = int(res.exit_code)
                item["stdoutTail"] = res.stdout_tail
                item["stderrTail"] = res.stderr_tail
                if res.exit_code == 0:
                    item["status"] = "done"
                    # Report only when output asks for attention.
                    out = (res.stdout_tail or "") + "\n" + (res.stderr_tail or "")
                    if "ACTION REQUIRED" in out or "ALERT" in out:
                        sections.append(f"• {job.name} ({job.id})\n- {out.strip()[:800]}")
                else:
                    item["status"] = "failed"
                    sections.append(f"• ALERT: queued job failed\n- job: {job.name} ({job.id})\n- exit: {res.exit_code}")
                new_queue.append(item)
            except Exception as e:  # noqa: BLE001
                item["status"] = "failed"
                item["lastError"] = str(e)
                sections.append(f"• ALERT: queued job error\n- job: {job.name} ({job.id})\n- error: {e}")
                new_queue.append(item)

        # Keep the queue compact (recent history only).
        queue = new_queue[-200:]

    for jid, job in jobs.items():
        sj = state_jobs.get(jid)
        if not isinstance(sj, dict):
            sj = {}
            state_jobs[jid] = sj

        # v1 focuses on long-running jobs. One-shot jobs are executed explicitly
        # (or via a future queue/scheduler) and are not polled here.
        if job.kind != "long_running_read":
            continue
        if not job.enabled:
            continue

        quiet = _policy_quiet_hours(job, defaults)
        in_quiet = is_quiet_hours(now_local, quiet)

        status = run_status_cmd(job)

        # Stall detection: only for running long tasks.
        anomaly = False
        stall_seconds = float(_policy_int(job, defaults, "stallSeconds") or 0)
        if job.kind == "long_running_read" and status.running and status.progress_key and stall_seconds > 0:
            last_pk = sj.get("lastProgressKey")
            last_pk = last_pk if isinstance(last_pk, str) else None
            last_prog_at = sj.get("lastProgressAt")
            try:
                last_prog_ts = float(last_prog_at) if isinstance(last_prog_at, (int, float)) else 0.0
            except Exception:
                last_prog_ts = 0.0
            if status.progress_key != last_pk:
                sj["lastProgressKey"] = status.progress_key
                sj["lastProgressAt"] = float(now)
            elif last_prog_ts and (now - last_prog_ts >= stall_seconds):
                anomaly = True
                status = JobStatus(
                    running=status.running,
                    completed=status.completed,
                    pid=status.pid,
                    stop_reason=status.stop_reason,
                    progress=status.progress,
                    progress_key=status.progress_key,
                    level="alert",
                    message=status.message or f"stalled >= {int(stall_seconds)}s",
                )

        # Paused enabled long tasks are anomalous (unless completed).
        if job.kind == "long_running_read" and job.enabled and not status.running and not status.completed:
            anomaly = True

        autorun_note = maybe_autorun_start(
            job=job, status=status, now=now, state_job=sj, defaults=defaults, dry_run=dry_run
        )
        # If we started it, refresh status next tick; still report immediately.

        anomaly_key: str | None = None
        if anomaly:
            try:
                anomaly_key = json.dumps(
                    {
                        "running": bool(status.running),
                        "completed": bool(status.completed),
                        "stopReason": status.stop_reason,
                        "level": status.level,
                        "message": status.message,
                        "progressKey": status.progress_key,
                    },
                    sort_keys=True,
                    ensure_ascii=False,
                )
            except Exception:
                anomaly_key = "anomaly"
        else:
            sj.pop("lastAnomalyKey", None)
            sj.pop("lastAnomalyReportAt", None)

        # Quiet hours policy: suppress routine progress, but never suppress anomalies/autorun/config errors.
        if in_quiet and not anomaly and not autorun_note:
            # Still update lastSeen so we can detect changes after quiet hours.
            sj["lastSeen"] = {
                "running": bool(status.running),
                "completed": bool(status.completed),
                "progressKey": status.progress_key,
                "stopReason": status.stop_reason,
            }
            continue

        if should_report(
            job=job,
            status=status,
            anomaly_key=anomaly_key,
            now=now,
            state_job=sj,
            defaults=defaults,
            anomaly=anomaly,
            autorun_note=autorun_note,
        ):
            sj["lastReportAt"] = float(now)
            if status.completed:
                sj["reportedCompleted"] = True
            if anomaly:
                sj["lastAnomalyKey"] = anomaly_key
                sj["lastAnomalyReportAt"] = float(now)
            sections.append(build_section(job, status, anomaly=anomaly, autorun_note=autorun_note))

        sj["lastSeen"] = {
            "running": bool(status.running),
            "completed": bool(status.completed),
            "progressKey": status.progress_key,
            "stopReason": status.stop_reason,
        }

    if sections:
        header = f"🛠️ Ops 快报（{datetime.fromtimestamp(now).strftime('%H:%M:%S')}）"
        report = header + "\n\n" + "\n\n".join(sections)
        if print_only:
            print(report)
        else:
            tg = target or find_default_telegram_target(OPENCLAW_HOME)
            if not tg:
                print("ERROR: missing Telegram target. Pass --target <chat_id>.", file=sys.stderr)
                return 3
            send_telegram_best_effort(openclaw_home=OPENCLAW_HOME, target=tg, message=report)

    persist_state(path=state_path, state=state, jobs=state_jobs, queue=queue)
    return 0


def cmd_tick(args: argparse.Namespace) -> int:
    return tick(
        config_path=Path(args.config_file).expanduser(),
        state_path=Path(args.state_file).expanduser(),
        target=(str(args.target).strip() or None),
        print_only=bool(args.print_only),
        dry_run=bool(args.dry_run),
    )


def _load_for_cmd(args: argparse.Namespace) -> tuple[JobDefaults, dict[str, JobConfig], dict[str, Any], dict[str, Any], list[dict[str, Any]], Path]:
    config_path = Path(getattr(args, "config_file", str(DEFAULT_CONFIG_FILE))).expanduser()
    state_path = Path(getattr(args, "state_file", str(DEFAULT_STATE_FILE))).expanduser()
    defaults, jobs = load_jobs_config(config_path)
    state, state_jobs, queue = load_state(state_path)
    for jid in jobs:
        if not isinstance(state_jobs.get(jid), dict):
            state_jobs[jid] = {}
    return defaults, jobs, state, state_jobs, queue, state_path


def cmd_status(args: argparse.Namespace) -> int:
    _, jobs, state, state_jobs, queue, state_path = _load_for_cmd(args)
    _ = state_path
    _ = state
    lines: list[str] = []
    for jid, job in jobs.items():
        sj = state_jobs.get(jid) if isinstance(state_jobs.get(jid), dict) else {}
        if job.kind == "long_running_read":
            st = run_status_cmd(job)
            if st.completed:
                status_s = "completed"
            elif st.running:
                status_s = f"running pid={st.pid}" if st.pid else "running"
            else:
                status_s = "paused"
            lines.append(f"- {jid}: {status_s}")
        elif job.kind == "one_shot_read":
            last = sj.get("lastRun") if isinstance(sj.get("lastRun"), dict) else {}
            exit_code = last.get("exitCode")
            if isinstance(exit_code, int):
                lines.append(f"- {jid}: lastRun exit={exit_code}")
            else:
                lines.append(f"- {jid}: never ran")
        else:
            granted = _approval_granted(job)
            lines.append(f"- {jid}: write (approved={granted})")
    if queue:
        lines.append("")
        lines.append(f"queue: {len(queue)}")
    print("\n".join(lines).strip())
    return 0


def cmd_start(args: argparse.Namespace) -> int:
    now = _now_ts()
    defaults, jobs, state, state_jobs, queue, state_path = _load_for_cmd(args)
    _ = defaults
    jid = str(args.job_id).strip()
    job = jobs.get(jid)
    if not job:
        print(f"ERROR: unknown job id: {jid}", file=sys.stderr)
        return 2
    if job.kind != "long_running_read":
        print(f"ERROR: job {jid} is not long_running_read", file=sys.stderr)
        return 2
    if job.risk != "read_only" and not bool(args.allow_risk):
        print(f"ERROR: job {jid} risk={job.risk}; pass --allow-risk to run", file=sys.stderr)
        return 2
    argv = job.commands.get("start")
    if not argv:
        print(f"ERROR: job {jid} missing commands.start", file=sys.stderr)
        return 2
    res = run_cmd(argv, cwd=job.cwd, timeout_seconds=int(args.timeout_seconds))
    sj = state_jobs[jid]
    sj["lastManualStartAt"] = float(now)
    sj["lastStart"] = {
        "exitCode": int(res.exit_code),
        "durationMs": int(res.duration_ms),
        "stdoutTail": res.stdout_tail,
        "stderrTail": res.stderr_tail,
    }
    persist_state(state_path, state=state, jobs=state_jobs, queue=queue)
    print(f"start {jid}: exit={res.exit_code} durMs={res.duration_ms}")
    if res.stdout_tail:
        print(res.stdout_tail)
    if res.stderr_tail:
        print(res.stderr_tail, file=sys.stderr)
    return 0 if res.exit_code == 0 else 1


def cmd_stop(args: argparse.Namespace) -> int:
    now = _now_ts()
    defaults, jobs, state, state_jobs, queue, state_path = _load_for_cmd(args)
    _ = defaults
    jid = str(args.job_id).strip()
    job = jobs.get(jid)
    if not job:
        print(f"ERROR: unknown job id: {jid}", file=sys.stderr)
        return 2
    if job.kind != "long_running_read":
        print(f"ERROR: job {jid} is not long_running_read", file=sys.stderr)
        return 2

    sj = state_jobs[jid]
    if job.commands.get("stop"):
        res = run_cmd(job.commands["stop"], cwd=job.cwd, timeout_seconds=int(args.timeout_seconds))
        sj["lastStopAt"] = float(now)
        sj["lastStop"] = {"exitCode": res.exit_code, "durationMs": res.duration_ms, "stdoutTail": res.stdout_tail, "stderrTail": res.stderr_tail}
        persist_state(state_path, state=state, jobs=state_jobs, queue=queue)
        print(f"stop {jid}: exit={res.exit_code}")
        return 0 if res.exit_code == 0 else 1

    st = run_status_cmd(job)
    if not st.pid:
        print(f"ERROR: job {jid} has no commands.stop and status.pid is missing", file=sys.stderr)
        return 2
    try:
        os.kill(int(st.pid), signal.SIGTERM)
    except Exception as e:
        print(f"ERROR: failed to SIGTERM pid={st.pid}: {e}", file=sys.stderr)
        return 1

    sj["lastStopAt"] = float(now)
    sj["lastStop"] = {"exitCode": 0, "durationMs": 0, "stdoutTail": f"SIGTERM pid={st.pid}", "stderrTail": ""}
    persist_state(state_path, state=state, jobs=state_jobs, queue=queue)
    print(f"stop {jid}: SIGTERM pid={st.pid}")
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    now = _now_ts()
    defaults, jobs, state, state_jobs, queue, state_path = _load_for_cmd(args)
    _ = defaults
    jid = str(args.job_id).strip()
    job = jobs.get(jid)
    if not job:
        print(f"ERROR: unknown job id: {jid}", file=sys.stderr)
        return 2
    if job.kind != "one_shot_read":
        print(f"ERROR: job {jid} is not one_shot_read", file=sys.stderr)
        return 2
    sj = state_jobs[jid]
    res = run_one_shot_read(
        job=job,
        now=now,
        state_job=sj,
        timeout_seconds=int(args.timeout_seconds),
        dry_run=bool(args.dry_run),
    )
    persist_state(state_path, state=state, jobs=state_jobs, queue=queue)
    print(f"run {jid}: exit={res.exit_code} durMs={res.duration_ms}")
    if res.stdout_tail:
        print(res.stdout_tail)
    if res.stderr_tail:
        print(res.stderr_tail, file=sys.stderr)
    return 0 if res.exit_code == 0 else 1


def cmd_validate(args: argparse.Namespace) -> int:
    defaults, jobs = load_jobs_config(Path(args.config_file).expanduser())
    print(f"OK: version=1 jobs={len(jobs)} defaults={defaults}")
    return 0


def cmd_selftest(_: argparse.Namespace) -> int:
    import tempfile
    import unittest
    from contextlib import redirect_stdout
    from io import StringIO

    class Tests(unittest.TestCase):
        def test_quiet_hours_wrap(self):
            q = QuietHours(start="23:00", end="08:00")
            dt = datetime(2026, 2, 5, 23, 30).astimezone()
            self.assertTrue(is_quiet_hours(dt, q))

        def test_quiet_hours_non_wrap(self):
            q = QuietHours(start="08:00", end="10:00")
            dt = datetime(2026, 2, 5, 9, 0).astimezone()
            self.assertTrue(is_quiet_hours(dt, q))

        def test_config_validation_empty(self):
            with tempfile.TemporaryDirectory() as td:
                p = Path(td) / "c.json"
                atomic_write_json(
                    p,
                    {
                        "version": 1,
                        "defaults": {
                            "quietHours": {"start": "23:00", "end": "08:00"},
                            "reportEverySeconds": 1800,
                            "stallSeconds": 3600,
                            "autoResume": False,
                            "autoResumeBackoffSeconds": 900,
                        },
                        "jobs": [],
                    },
                )
                defaults, jobs = load_jobs_config(p)
                self.assertEqual(len(jobs), 0)
                self.assertEqual(defaults.report_every_seconds, 1800)

        def test_status_parser_requires_booleans(self):
            with self.assertRaises(ValueError):
                _status_from_json({"running": 1, "completed": False})

        def test_one_shot_write_requires_verification_job(self):
            with tempfile.TemporaryDirectory() as td:
                td = Path(td)
                cfg = td / "c.json"
                atomic_write_json(
                    cfg,
                    {
                        "version": 1,
                        "defaults": {"quietHours": {"start": "00:00", "end": "00:00"}},
                        "jobs": [
                            {
                                "id": "w1",
                                "kind": "one_shot_write",
                                "enabled": False,
                                "risk": "write_external",
                                "commands": {"run": [sys.executable, "-c", "print('x')"]},
                                "after": [],
                            }
                        ],
                    },
                )
                with self.assertRaises(ValueError):
                    load_jobs_config(cfg)

        def test_tick_autorun_can_call_start(self):
            with tempfile.TemporaryDirectory() as td:
                td = Path(td)
                (td / "start.py").write_text("from pathlib import Path; Path('started').write_text('1')\n", encoding="utf-8")
                (td / "status.py").write_text("import json; print(json.dumps({'running': False, 'completed': False}))\n", encoding="utf-8")

                cfg = td / "c.json"
                st = td / "s.json"
                atomic_write_json(
                    cfg,
                    {
                        "version": 1,
                        "defaults": {"quietHours": {"start": "00:00", "end": "00:00"}},
                        "jobs": [
                            {
                                "id": "j1",
                                "kind": "long_running_read",
                                "enabled": True,
                                "risk": "read_only",
                                "cwd": str(td),
                                "commands": {
                                    "start": [sys.executable, str(td / "start.py")],
                                    "status": [sys.executable, str(td / "status.py")],
                                },
                                "policy": {"autoResume": True, "reportEverySeconds": 0},
                            }
                        ],
                    },
                )
                buf = StringIO()
                with redirect_stdout(buf):
                    rc = tick(config_path=cfg, state_path=st, target=None, print_only=True, dry_run=False)
                self.assertEqual(rc, 0)
                self.assertTrue((td / "started").is_file())
                self.assertIn("AUTORUN", buf.getvalue())

        def test_tick_processes_queue_one_shot_read(self):
            with tempfile.TemporaryDirectory() as td:
                td = Path(td)
                (td / "run.py").write_text("print('ACTION REQUIRED: test')\n", encoding="utf-8")

                cfg = td / "c.json"
                st = td / "s.json"
                atomic_write_json(
                    cfg,
                    {
                        "version": 1,
                        "defaults": {"quietHours": {"start": "00:00", "end": "00:00"}},
                        "jobs": [
                            {
                                "id": "r1",
                                "kind": "one_shot_read",
                                "enabled": False,
                                "risk": "read_only",
                                "cwd": str(td),
                                "commands": {"run": [sys.executable, str(td / "run.py")]},
                            }
                        ],
                    },
                )
                atomic_write_json(
                    st,
                    {
                        "version": 1,
                        "jobs": {},
                        "queue": [{"id": "q1", "jobId": "r1", "status": "pending", "notBefore": 0, "attempt": 0}],
                    },
                )
                buf = StringIO()
                with redirect_stdout(buf):
                    rc = tick(config_path=cfg, state_path=st, target=None, print_only=True, dry_run=False)
                self.assertEqual(rc, 0)
                self.assertIn("ACTION REQUIRED", buf.getvalue())
                state = load_json_quiet(st) or {}
                q = state.get("queue")
                self.assertTrue(isinstance(q, list))
                self.assertEqual(q[-1].get("status"), "done")

    suite = unittest.TestLoader().loadTestsFromTestCase(Tests)
    ok = unittest.TextTestRunner(verbosity=1).run(suite).wasSuccessful()
    if not ok:
        return 1
    print("selftest: OK")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Ops Monitor (0-token): monitor jobs and send Telegram alerts.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_tick = sub.add_parser("tick", help="Run one monitoring tick")
    p_tick.add_argument("--config-file", default=str(DEFAULT_CONFIG_FILE))
    p_tick.add_argument("--state-file", default=str(DEFAULT_STATE_FILE))
    p_tick.add_argument("--target", default="", help="Telegram chat id (default: main heartbeat target)")
    p_tick.add_argument("--print-only", action="store_true", help="Print to stdout only; do not send")
    p_tick.add_argument("--dry-run", action="store_true", help="Do not execute any autoruns; monitoring only")
    p_tick.set_defaults(func=cmd_tick)

    p_status = sub.add_parser("status", help="Print current job statuses (no Telegram)")
    p_status.add_argument("--config-file", default=str(DEFAULT_CONFIG_FILE))
    p_status.add_argument("--state-file", default=str(DEFAULT_STATE_FILE))
    p_status.set_defaults(func=cmd_status)

    p_start = sub.add_parser("start", help="Start a long_running_read job (explicit)")
    p_start.add_argument("job_id")
    p_start.add_argument("--config-file", default=str(DEFAULT_CONFIG_FILE))
    p_start.add_argument("--state-file", default=str(DEFAULT_STATE_FILE))
    p_start.add_argument("--timeout-seconds", type=int, default=60)
    p_start.add_argument("--allow-risk", action="store_true", help="Allow non-read_only risk jobs (dangerous)")
    p_start.set_defaults(func=cmd_start)

    p_stop = sub.add_parser("stop", help="Stop a long_running_read job (explicit)")
    p_stop.add_argument("job_id")
    p_stop.add_argument("--config-file", default=str(DEFAULT_CONFIG_FILE))
    p_stop.add_argument("--state-file", default=str(DEFAULT_STATE_FILE))
    p_stop.add_argument("--timeout-seconds", type=int, default=60)
    p_stop.set_defaults(func=cmd_stop)

    p_run = sub.add_parser("run", help="Run a one_shot_read job once (explicit)")
    p_run.add_argument("job_id")
    p_run.add_argument("--config-file", default=str(DEFAULT_CONFIG_FILE))
    p_run.add_argument("--state-file", default=str(DEFAULT_STATE_FILE))
    p_run.add_argument("--timeout-seconds", type=int, default=300)
    p_run.add_argument("--dry-run", action="store_true")
    p_run.set_defaults(func=cmd_run)

    p_val = sub.add_parser("validate-config", help="Validate ops-jobs config")
    p_val.add_argument("--config-file", default=str(DEFAULT_CONFIG_FILE))
    p_val.set_defaults(func=cmd_validate)

    p_test = sub.add_parser("selftest", help="Run offline self tests")
    p_test.set_defaults(func=cmd_selftest)

    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())

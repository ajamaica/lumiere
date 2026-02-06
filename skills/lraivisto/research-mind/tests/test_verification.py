import json

import scripts.core as core


def test_plan_verification_missions_creates_and_dedups(db_conn):
    core.start_project("p1", "Project 1", "Obj")

    low_id = core.add_insight(
        "p1",
        "Dubious claim",
        "This is likely unverified and needs corroboration.",
        tags="unverified",
        confidence=0.4,
    )
    core.add_insight("p1", "High confidence", "Looks solid.", tags="", confidence=0.95)

    missions = core.plan_verification_missions("p1", threshold=0.7, max_missions=10)
    assert missions
    assert all(fid == low_id for (_mid, fid, _q) in missions)

    # Second run should be a no-op due to dedup hashing.
    missions2 = core.plan_verification_missions("p1", threshold=0.7, max_missions=10)
    assert missions2 == []


def test_run_verification_missions_marks_done(db_conn, mocker):
    core.start_project("p1", "Project 1", "Obj")
    core.add_insight("p1", "Dubious claim", "Needs corroboration.", tags="unverified", confidence=0.4)

    created = core.plan_verification_missions("p1", threshold=0.7, max_missions=3)
    assert created

    mocker.patch(
        "scripts.core.perform_brave_search",
        return_value={"web": {"results": [{"url": "https://example.com", "title": "Example"}]}},
    )

    results = core.run_verification_missions("p1", limit=1)
    assert results
    assert results[0]["status"] == "done"

    mid = results[0]["id"]
    c = db_conn.cursor()
    c.execute("SELECT status, completed_at, result_meta FROM verification_missions WHERE id=?", (mid,))
    status, completed_at, result_meta = c.fetchone()
    assert status == "done"
    assert completed_at is not None

    meta = json.loads(result_meta)
    assert meta.get("result_count") == 1
    assert meta.get("top_url") == "https://example.com"


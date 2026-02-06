import scripts.core as core


def test_default_branch_created_on_project_init(db_conn):
    core.start_project("p1", "Project 1", "Obj")

    c = db_conn.cursor()
    c.execute("SELECT name FROM branches WHERE project_id='p1'")
    names = {r[0] for r in c.fetchall()}
    assert "main" in names


def test_branch_scopes_findings_and_events(db_conn):
    core.start_project("p1", "Project 1", "Obj")
    core.create_branch("p1", "alt", hypothesis="Try a competing explanation")

    # Default branch (main)
    core.add_insight("p1", "Main finding", "Main content", tags="t-main", confidence=0.9)
    core.log_event("p1", "E_MAIN", 1, {"ok": True})

    # Alt branch
    core.add_insight("p1", "Alt finding", "Alt content", tags="t-alt", confidence=0.6, branch="alt")
    core.log_event("p1", "E_ALT", 1, {"alt": True}, branch="alt")

    main_findings = core.get_insights("p1")
    alt_findings = core.get_insights("p1", branch="alt")

    assert [r[0] for r in main_findings] == ["Main finding"]
    assert [r[0] for r in alt_findings] == ["Alt finding"]

    main_status = core.get_status("p1")
    alt_status = core.get_status("p1", branch="alt")

    assert [e[0] for e in main_status["recent_events"]] == ["E_MAIN"]
    assert [e[0] for e in alt_status["recent_events"]] == ["E_ALT"]


def test_hypothesis_add_and_list(db_conn):
    core.start_project("p1", "Project 1", "Obj")
    core.create_branch("p1", "alt")

    hid = core.add_hypothesis(
        "p1",
        "alt",
        "The signal is confounded by source bias.",
        rationale="Alternate branch focuses on corroboration.",
        confidence=0.55,
        status="open",
    )
    assert hid.startswith("hyp_")

    by_branch = core.list_hypotheses("p1", branch="alt")
    assert len(by_branch) == 1
    assert by_branch[0][0] == hid
    assert by_branch[0][1] == "alt"
    assert "confounded" in by_branch[0][2]

    all_h = core.list_hypotheses("p1")
    assert len(all_h) == 1

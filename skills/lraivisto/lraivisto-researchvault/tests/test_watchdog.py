import scripts.core as core
from scripts.scuttle import ArtifactDraft, Connector
from scripts.watchdog import run_once


def test_watch_target_dedup_and_list(db_conn):
    core.start_project("p1", "Project 1", "Obj")

    t1 = core.add_watch_target("p1", "query", "alpha beta", interval_s=0, tags="w")
    t2 = core.add_watch_target("p1", "query", "alpha beta", interval_s=0, tags="w")
    assert t1 == t2

    rows = core.list_watch_targets("p1", status="active")
    assert len(rows) == 1
    assert rows[0][0] == t1


def test_watchdog_ingests_query_targets_without_duplicates(db_conn, mocker):
    core.start_project("p1", "Project 1", "Obj")
    tid = core.add_watch_target("p1", "query", "alpha beta", interval_s=0, tags="watch")

    mocker.patch(
        "scripts.core.perform_brave_search",
        return_value={"web": {"results": [{"url": "https://example.com", "title": "Example", "description": "d"}]}},
    )

    actions = run_once(project_id="p1", limit=5)
    assert any(a.get("id") == tid and a.get("status") == "ingested" for a in actions)

    c = db_conn.cursor()
    c.execute("SELECT COUNT(*) FROM findings WHERE project_id='p1' AND title='Watchdog: alpha beta'")
    assert c.fetchone()[0] == 1

    # Second run should see identical result hash and not add a new finding.
    actions2 = run_once(project_id="p1", limit=5)
    assert any(a.get("id") == tid and a.get("status") == "no_change" for a in actions2)

    c.execute("SELECT COUNT(*) FROM findings WHERE project_id='p1' AND title='Watchdog: alpha beta'")
    assert c.fetchone()[0] == 1


def test_watchdog_ingests_url_targets_via_connectors(db_conn, mocker):
    core.start_project("p1", "Project 1", "Obj")
    tid = core.add_watch_target("p1", "url", "mock://signal", interval_s=0, tags="mock")

    class MockConnector(Connector):
        def can_handle(self, source: str) -> bool:
            return source.startswith("mock://")

        def fetch(self, source: str) -> ArtifactDraft:
            return ArtifactDraft(
                title="Mock Title",
                content="Mock Content",
                source="mock",
                type="MOCK",
                confidence=0.9,
                tags=["mock"],
            )

    service = core.IngestService()
    service.register_connector(MockConnector())
    mocker.patch("scripts.watchdog.core.get_ingest_service", return_value=service)

    actions = run_once(project_id="p1", limit=5)
    assert any(a.get("id") == tid and a.get("success") is True for a in actions)

    c = db_conn.cursor()
    c.execute("SELECT COUNT(*) FROM findings WHERE project_id='p1' AND title='Mock Title'")
    assert c.fetchone()[0] == 1

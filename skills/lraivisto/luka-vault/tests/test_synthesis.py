import scripts.core as core
from scripts.synthesis import SYNTHESIS_LINK_TYPE, synthesize


def test_synthesize_creates_similarity_links(db_conn):
    core.start_project("p1", "Project 1", "Obj")

    core.add_insight("p1", "Shared", "alpha beta gamma", tags="t", confidence=0.7)
    core.add_insight("p1", "Shared", "alpha beta gamma", tags="t", confidence=0.7)
    core.add_insight("p1", "Different", "completely unrelated tokens", tags="x", confidence=0.7)

    links = synthesize("p1", threshold=0.95, top_k=5, max_links=10, persist=True)
    assert len(links) == 1

    c = db_conn.cursor()
    c.execute("SELECT id FROM findings WHERE project_id='p1' AND title='Shared' ORDER BY created_at ASC")
    shared_ids = [r[0] for r in c.fetchall()]
    assert len(shared_ids) == 2

    expected_pair = (min(shared_ids[0], shared_ids[1]), max(shared_ids[0], shared_ids[1]))
    assert (links[0]["source_id"], links[0]["target_id"]) == expected_pair

    c.execute(
        "SELECT COUNT(*) FROM links WHERE link_type=? AND source_id=? AND target_id=?",
        (SYNTHESIS_LINK_TYPE, expected_pair[0], expected_pair[1]),
    )
    assert c.fetchone()[0] == 1

    # Re-run should not create duplicate rows.
    synthesize("p1", threshold=0.95, top_k=5, max_links=10, persist=True)
    c.execute("SELECT COUNT(*) FROM links WHERE link_type=?", (SYNTHESIS_LINK_TYPE,))
    assert c.fetchone()[0] == 1


def test_synthesize_links_artifacts_to_findings(db_conn, tmp_path):
    core.start_project("p1", "Project 1", "Obj")

    p = tmp_path / "artifact.txt"
    p.write_text("alpha beta gamma", encoding="utf-8")

    art_id = core.add_artifact("p1", str(p), metadata={"title": "Artifact"}, branch=None)
    core.add_insight("p1", "Finding", "alpha beta gamma", tags="", confidence=0.7)

    links = synthesize("p1", threshold=0.6, top_k=5, max_links=10, persist=True)
    assert links, "Expected at least one link"

    ids = {(l["source_id"], l["target_id"]) for l in links}
    # The synth engine stores sorted ids; artifact ids are prefixed with art_.
    found = any(art_id in pair for pair in ids)
    assert found

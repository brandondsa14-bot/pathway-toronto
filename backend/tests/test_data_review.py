import json
from pathlib import Path
import pytest
from app.data_review import evidence_report, QUEUE_PATH


def test_day23_production_audit_keeps_all_routes_blocked():
    report = evidence_report()
    assert report["documented_place_names"] == 6
    assert report["verified_routable_edges"] == 0
    assert report["needing_primary_evidence"] == 6
    assert not report["routable_data_available"]


def test_queue_rejects_undeclared_place(tmp_path: Path):
    data = json.loads(QUEUE_PATH.read_text())
    data["items"][0]["id"] = "fictional_tunnel"
    path = tmp_path / "invalid.json"
    path.write_text(json.dumps(data))
    with pytest.raises(ValueError, match="review anchor"):
        evidence_report(path)


def test_queue_rejects_unknown_source(tmp_path: Path):
    data = json.loads(QUEUE_PATH.read_text())
    data["items"][0]["source_ids"] = ["unlicensed-source"]
    path = tmp_path / "invalid.json"
    path.write_text(json.dumps(data))
    with pytest.raises(ValueError, match="Unknown source"):
        evidence_report(path)


def test_queue_rejects_duplicate_anchor(tmp_path: Path):
    data = json.loads(QUEUE_PATH.read_text())
    data["items"].append(data["items"][0].copy())
    path = tmp_path / "invalid.json"
    path.write_text(json.dumps(data))
    with pytest.raises(ValueError, match="repeated review"):
        evidence_report(path)

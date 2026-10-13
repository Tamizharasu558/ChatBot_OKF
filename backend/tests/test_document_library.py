import pytest
from starlette.testclient import TestClient
from backend.app.main import app

def test_get_library_catalog():
    with TestClient(app) as client:
        res = client.get("/api/library")
        assert res.status_code == 200
        data = res.json()
        assert "documents" in data
        assert "stats" in data
        assert len(data["documents"]) > 0
        doc = data["documents"][0]
        assert "concept_id" in doc
        assert "word_count" in doc
        assert "reading_time_minutes" in doc
        assert "file_format" in doc
        assert "trust_tier" in doc
        assert data["stats"]["total_documents"] >= 6
        assert data["stats"]["avg_readability"] > 0

def test_get_document_intelligence_report():
    with TestClient(app) as client:
        res = client.get("/api/library/technical/api_architecture")
        assert res.status_code == 200
        data = res.json()
        assert data["concept_id"] == "technical/api_architecture"
        assert data["title"] == "Core REST API Architecture"
        assert "readability_score" in data
        assert "complexity_level" in data
        assert "entities" in data
        assert "outline" in data
        assert len(data["outline"]) > 0
        assert "suggested_questions" in data
        assert len(data["suggested_questions"]) > 0

def test_batch_upload_and_delete_flow():
    doc1 = "# Network Security Protocols\nAll egress traffic must go through proxy.\nPort 443 only.\n"
    doc2 = "Policy Title: Remote Work Compliance\nVPN is mandatory for remote workers.\n"

    with TestClient(app) as client:
        # 1. Batch upload
        res = client.post(
            "/api/library/batch-upload",
            files=[
                ("files", ("network_sec.md", doc1.encode("utf-8"), "text/markdown")),
                ("files", ("remote_work.txt", doc2.encode("utf-8"), "text/plain"))
            ]
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["total_uploaded"] == 2
        assert len(data["results"]) == 2

        # 2. Verify in library
        lib_res = client.get("/api/library")
        assert lib_res.status_code == 200
        lib_data = lib_res.json()
        concept_ids = [d["concept_id"] for d in lib_data["documents"]]
        assert any("network_sec" in cid for cid in concept_ids)
        assert any("remote_work" in cid for cid in concept_ids)

        # 3. Delete one
        target_cid = next(cid for cid in concept_ids if "remote_work" in cid)
        del_res = client.delete(f"/api/library/{target_cid}")
        assert del_res.status_code == 200
        del_data = del_res.json()
        assert del_data["success"] is True

        # 4. Verify deleted
        lib_res2 = client.get("/api/library")
        concept_ids2 = [d["concept_id"] for d in lib_res2.json()["documents"]]
        assert target_cid not in concept_ids2

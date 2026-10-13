import pytest
from starlette.testclient import TestClient
from backend.app.main import app

def test_intelligence_workspace_stats():
    with TestClient(app) as client:
        res = client.get("/api/intelligence/stats")
        assert res.status_code == 200
        data = res.json()
        assert "health_score" in data
        assert "trust_distribution" in data
        assert "graph" in data
        assert len(data["graph"]["nodes"]) >= 5
        assert len(data["graph"]["edges"]) >= 1  # Links between revenue_metric and attested_revenue_metric

def test_acknowledge_concept_updates_trust():
    with TestClient(app) as client:
        # Acknowledge API Architecture with an actor
        payload = {
            "concept_id": "technical/api_architecture",
            "actor": "human:security_lead",
            "notes": "Verified against internal OAuth gateway"
        }
        res = client.post("/api/intelligence/acknowledge", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["new_trust_tier"] == "human-reviewed"
        assert "security_lead" in data["acknowledged_by"]

def test_analyze_concept_deep_dive():
    with TestClient(app) as client:
        res = client.get("/api/intelligence/analyze/technical/api_architecture")
        assert res.status_code == 200
        data = res.json()
        assert data["concept_id"] == "technical/api_architecture"
        assert "metrics" in data
        assert data["metrics"]["word_count"] > 50
        assert len(data["sections"]) >= 2

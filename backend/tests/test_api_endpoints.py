import pytest
from starlette.testclient import TestClient
from backend.app.main import app

def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["indexed_concepts"] >= 5

def test_get_knowledge_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/knowledge")
        assert response.status_code == 200
        data = response.json()
        assert data["total_concepts"] >= 5
        assert len(data["documents"]) >= 5

def test_chat_api_endpoint():
    with TestClient(app) as client:
        payload = {"question": "What are the API rate limits?"}
        response = client.post("/api/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert len(data["sources"]) > 0
        assert data["confidence"] == "grounded"

def test_chat_api_unsupported_question():
    with TestClient(app) as client:
        payload = {"question": "What is the temperature on Neptune?"}
        response = client.post("/api/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "I couldn't find enough information" in data["answer"]
        assert len(data["sources"]) == 0

def test_conversations_flow():
    with TestClient(app) as client:
        # 1. Ask question to create conversation
        res = client.post("/api/chat", json={"question": "What are the available subscription tiers?"})
        assert res.status_code == 200
        conv_id = res.json()["conversation_id"]

        # 2. List conversations
        res_list = client.get("/api/conversations")
        assert res_list.status_code == 200
        convs = res_list.json()
        assert any(c["id"] == conv_id for c in convs)

        # 3. Get messages
        res_msgs = client.get(f"/api/conversations/{conv_id}")
        assert res_msgs.status_code == 200
        msgs = res_msgs.json()
        assert len(msgs) >= 2  # user + assistant

        # 4. Delete conversation
        res_del = client.delete(f"/api/conversations/{conv_id}")
        assert res_del.status_code == 200

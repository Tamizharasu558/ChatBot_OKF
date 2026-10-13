import io
import pytest
from starlette.testclient import TestClient
from backend.app.main import app

def test_upload_and_ask_from_file():
    sample_policy_text = """
Company Cloud Security Standards 2026:
All production servers must use Debian 12 or Ubuntu 24.04 LTS.
SSH port must be changed to 2222 across all virtual machines.
Database passwords must be rotated every 45 days.
Root logins over SSH are strictly forbidden.
"""
    file_bytes = sample_policy_text.encode("utf-8")

    with TestClient(app) as client:
        # 1. Upload the file
        response = client.post(
            "/api/upload",
            files={"file": ("cloud_security_policy.txt", file_bytes, "text/plain")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "cloud_security_policy" in data["concept_id"]
        assert "Successfully" in data["explanation"]
        assert "Executive Summary" in data["explanation"]
        conv_id = data["conversation_id"]

        # 2. Ask a question about the uploaded document
        chat_res = client.post(
            "/api/chat",
            json={
                "question": "What port must SSH be changed to according to the security policy?",
                "conversation_id": conv_id
            }
        )
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        assert "2222" in chat_data["answer"]
        assert chat_data["confidence"] == "grounded"
        assert len(chat_data["sources"]) > 0
        assert any("cloud_security_policy" in s["concept_id"] for s in chat_data["sources"])

def test_upload_with_attached_question():
    incident_runbook = """
Incident Response Severity Escalation:
Severity 1 incidents require an incident commander within 10 minutes.
Engineering VP must be paged if unresolved after 30 minutes.
Customer communication banner must be published within 15 minutes.
"""
    file_bytes = incident_runbook.encode("utf-8")

    with TestClient(app) as client:
        response = client.post(
            "/api/upload",
            files={"file": ("incident_runbook.md", file_bytes, "text/markdown")},
            data={"question": "What is the requirement for Severity 1 incident commander?"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "10 minutes" in data["explanation"]
        assert len(data["sources"]) > 0

def test_upload_code_and_config_files():
    python_code = "def calculate_discount(price, rate):\n    return price * (1.0 - rate)\n"
    with TestClient(app) as client:
        response = client.post(
            "/api/upload",
            files={"file": ("discount_calc.py", python_code.encode("utf-8"), "text/x-python")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "discount_calc" in data["concept_id"]

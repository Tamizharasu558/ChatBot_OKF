from __future__ import annotations
import pytest
from starlette.testclient import TestClient

from backend.app.main import app
from backend.app.services.llm_service import format_llama_3_2_prompt, get_model_status
from backend.app.services.retrieval import RetrievalEngine
from backend.app.models.okf_models import PassageChunk

def test_llama_3_2_prompt_formatting():
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain RAG architecture."}
    ]
    prompt = format_llama_3_2_prompt(messages)
    assert "<|begin_of_text|>" in prompt
    assert "<|start_header_id|>system<|end_header_id|>" in prompt
    assert "<|eot_id|>" in prompt
    assert "<|start_header_id|>user<|end_header_id|>" in prompt
    assert "<|start_header_id|>assistant<|end_header_id|>" in prompt

def test_model_status_endpoint():
    with TestClient(app) as client:
        res = client.get("/api/model/status")
        assert res.status_code == 200
        data = res.json()
        assert data["is_llama_3_2"] is True
        assert "available_models" in data
        assert "groq" in data["available_models"]
        assert "ollama" in data["available_models"]
        assert "mock" in data["available_models"]
        assert any("llama-3.2" in m["id"] for m in data["available_models"]["groq"])

def test_model_switch_endpoint():
    with TestClient(app) as client:
        # Switch to Groq model config
        switch_res = client.post(
            "/api/model/switch",
            json={
                "provider": "groq",
                "model": "llama-3.2-3b-preview",
                "groq_api_key": "gsk_test_api_key_123"
            }
        )
        assert switch_res.status_code == 200
        status_data = switch_res.json()["status"]
        assert status_data["provider"] == "groq"
        assert status_data["model_id"] == "llama-3.2-3b-preview"
        assert status_data["groq_api_key_configured"] is True

        # Switch back to mock / offline engine
        switch_res_back = client.post(
            "/api/model/switch",
            json={"provider": "mock"}
        )
        assert switch_res_back.status_code == 200
        assert switch_res_back.json()["status"]["provider"] == "mock"

def test_hybrid_retrieval_synonym_expansion():
    engine = RetrievalEngine()
    test_chunk = PassageChunk(
        chunk_id="chunk-1",
        concept_id="faq/billing",
        document_title="Billing & Refund FAQ",
        document_type="FAQ",
        section_heading="Refund Guarantee",
        text="All customer subscriptions include a 14-day no-questions-asked refund policy.",
        tags=["billing", "refund", "subscriptions"],
        trust_tier="human-reviewed",
        status="stable"
    )
    engine.index_chunks([test_chunk])

    # Query using synonym "money-back" and "reimbursement"
    expanded_tokens = engine.expand_query("How do I request a cancellation and reimbursement?")
    assert "refund" in expanded_tokens or "money-back" in expanded_tokens

    results = engine.search("How do I request a cancellation and reimbursement?", top_k=2, min_score=0.5)
    assert len(results) > 0
    assert results[0].chunk.concept_id == "faq/billing"
    assert results[0].score > 0.5

def test_hybrid_retrieval_unrelated_query_zero_match():
    engine = RetrievalEngine()
    test_chunk = PassageChunk(
        chunk_id="chunk-1",
        concept_id="faq/billing",
        document_title="Billing & Refund FAQ",
        document_type="FAQ",
        section_heading="Refund Guarantee",
        text="All customer subscriptions include a 14-day refund policy.",
        tags=["billing", "refund"],
        trust_tier="human-reviewed",
        status="stable"
    )
    engine.index_chunks([test_chunk])

    results = engine.search("Ancient Roman military tactics in Gaul", top_k=2, min_score=0.5)
    assert len(results) == 0

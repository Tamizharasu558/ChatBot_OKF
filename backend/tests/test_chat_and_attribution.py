import asyncio
import pytest
from backend.app.services.knowledge_loader import knowledge_loader
from backend.app.services.retrieval import retrieval_engine
from backend.app.services.chat_service import chat_service
from backend.app.services.llm_service import UNSUPPORTED_ANSWER_MESSAGE

@pytest.fixture(autouse=True)
def setup_index():
    doc_count, chunk_count, _ = knowledge_loader.scan_and_load()
    retrieval_engine.index_chunks(knowledge_loader.chunks)

def test_chat_grounded_answer_with_sources():
    response = asyncio.run(chat_service.process_chat("What are the API rate limits?"))
    assert response.confidence == "grounded"
    assert "100" in response.answer or "rate limit" in response.answer.lower()
    assert len(response.sources) > 0
    assert any("api_architecture" in s.concept_id for s in response.sources)

def test_chat_refund_grounded_answer():
    response = asyncio.run(chat_service.process_chat("What is the refund policy?"))
    assert response.confidence == "grounded"
    assert "14-day" in response.answer
    assert any("billing_and_subscriptions" in s.concept_id for s in response.sources)

def test_chat_unsupported_question_admits_gap():
    response = asyncio.run(chat_service.process_chat("Who was the emperor of the Byzantine empire in 1453?"))
    assert response.confidence == "unsupported"
    assert response.answer == UNSUPPORTED_ANSWER_MESSAGE
    assert len(response.sources) == 0  # No false citations

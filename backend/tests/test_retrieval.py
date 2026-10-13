import pytest
from backend.app.services.knowledge_loader import KnowledgeLoader
from backend.app.services.retrieval import RetrievalEngine

@pytest.fixture
def indexed_engine():
    loader = KnowledgeLoader()
    loader.scan_and_load()
    engine = RetrievalEngine()
    engine.index_chunks(loader.chunks)
    return engine

def test_retrieval_finds_api_limits(indexed_engine):
    results = indexed_engine.search("what are the API rate limits?", top_k=3, min_score=0.5)
    assert len(results) > 0
    top_chunk = results[0].chunk
    assert top_chunk.concept_id == "technical/api_architecture"
    assert "rate limit" in top_chunk.text.lower() or "tier" in top_chunk.text.lower()

def test_retrieval_finds_refund_policy(indexed_engine):
    results = indexed_engine.search("how many days for a refund?", top_k=3, min_score=0.5)
    assert len(results) > 0
    top_chunk = results[0].chunk
    assert top_chunk.concept_id == "faq/billing_and_subscriptions"
    assert "14-day" in top_chunk.text.lower() or "refund" in top_chunk.text.lower()

def test_retrieval_unrelated_query_yields_empty_or_low_score(indexed_engine):
    # Irrelevant out-of-domain query
    results = indexed_engine.search("quantum gravity in string theory supercollider", top_k=3, min_score=1.0)
    assert len(results) == 0

def test_citations_include_metadata(indexed_engine):
    results = indexed_engine.search("data governance GDPR log retention", top_k=2, min_score=0.5)
    assert len(results) > 0
    citations = indexed_engine.passages_to_citations(results)
    assert len(citations) > 0
    first_cite = citations[0]
    assert first_cite.document_title != ""
    assert first_cite.concept_id != ""
    assert first_cite.passage_snippet != ""

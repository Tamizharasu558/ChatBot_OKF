import pytest
from pathlib import Path
from backend.app.services.knowledge_loader import KnowledgeLoader

def test_knowledge_loader_scans_bundle():
    loader = KnowledgeLoader()
    doc_count, chunk_count, findings = loader.scan_and_load()
    
    # We created 6 sample concept documents
    assert doc_count >= 5
    assert chunk_count >= doc_count
    
    # Check specific concepts
    assert "technical/api_architecture" in loader.documents
    assert "products/order_processing" in loader.documents
    assert "faq/billing_and_subscriptions" in loader.documents
    assert "general/data_governance" in loader.documents
    assert "technical/attested_revenue_metric" in loader.documents
    assert "technical/revenue_metric" in loader.documents

    overview = loader.get_overview()
    assert overview.total_concepts >= 5
    assert "technical" in overview.categories
    assert "faq" in overview.categories
    assert "API Endpoint" in overview.types

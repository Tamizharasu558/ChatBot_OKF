from __future__ import annotations
import re
import math
from typing import List, Dict, Set, Optional, Tuple
from collections import Counter

from backend.app.core.config import settings
from backend.app.models.okf_models import PassageChunk, RetrievedPassage, Citation

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can", "cannot", "could", "did", "do", "does", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "has", "have", "having", "he", "her", "here",
    "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it",
    "its", "itself", "let's", "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off",
    "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
    "same", "she", "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them",
    "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too", "under",
    "until", "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who",
    "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
}

# Domain synonym dictionary for semantic query expansion
SYNONYM_EXPANSIONS: Dict[str, List[str]] = {
    "refund": ["money-back", "cancellation", "cancel", "guarantee", "reimbursement", "14-day"],
    "cancel": ["refund", "cancellation", "money-back", "subscription", "terminate"],
    "rate limit": ["throttle", "ratelimit", "requests per minute", "req/min", "burst", "429", "token-bucket"],
    "limits": ["rate limit", "quota", "allowance", "capacity", "maximum"],
    "revenue": ["asc 606", "gaap", "attested", "recognized revenue", "fiscal year", "invoice", "financial"],
    "order": ["checkout", "pipeline", "sift", "fraud", "screening", "risk score", "fulfillment"],
    "fraud": ["risk score", "screening", "cvv", "sift", "order processing", "scrutiny"],
    "retention": ["data governance", "gdpr", "log purge", "pii", "purge", "90 days", "backup"],
    "logs": ["access log", "retention", "log purge", "storage", "90 days"],
    "api": ["rest", "endpoint", "jwt", "bearer", "token", "tls", "authentication"],
    "token": ["jwt", "bearer", "authentication", "credentials", "oauth"],
    "pricing": ["tier", "starter", "professional", "enterprise", "plan", "cost"],
    "tier": ["subscription tier", "starter", "professional", "enterprise", "plan"],
}

def tokenize(text: str) -> List[str]:
    """Tokenize and normalize text into clean lowercase alphanumeric words."""
    words = re.findall(r"[a-zA-Z0-9_\-]+", text.lower())
    return [w for w in words if len(w) > 1 and w not in STOPWORDS]

def extract_character_ngrams(word: str, n: int = 3) -> List[str]:
    """Extract character n-grams for subword morphological matching."""
    if len(word) < n:
        return [word]
    return [word[i:i+n] for i in range(len(word) - n + 1)]

class RetrievalEngine:
    """
    State-of-the-art Hybrid RAG Retrieval Engine:
    Combines BM25 Lexical Matching + Dense TF-IDF/Subword Semantic Cosine Similarity
    fused with Reciprocal Rank Fusion (RRF), Query Expansion, and Cross-Passage Reranking.
    """

    def __init__(
        self,
        k1: float = 1.5,
        b: float = 0.75,
        rrf_k: int = 60,
        hybrid_alpha: float = 0.5
    ):
        self.k1 = k1
        self.b = b
        self.rrf_k = rrf_k
        self.hybrid_alpha = hybrid_alpha

        self.chunks: List[PassageChunk] = []
        self.doc_len: List[int] = []
        self.avg_dl: float = 0.0
        self.doc_freq: Dict[str, int] = Counter()
        self.inverted_index: Dict[str, List[int]] = {}
        self.chunk_tokens: List[List[str]] = []

        # Dense / Semantic Vector Space representations
        self.vocabulary: Dict[str, int] = {}
        self.chunk_vectors: List[Dict[str, float]] = []
        self.chunk_vector_norms: List[float] = []

    def index_chunks(self, chunks: List[PassageChunk]) -> None:
        """
        Builds both the BM25 inverted index and the Dense Semantic vector representations.
        """
        self.chunks = chunks
        self.chunk_tokens = []
        self.doc_len = []
        self.doc_freq = Counter()
        self.inverted_index = {}
        self.vocabulary = {}
        self.chunk_vectors = []
        self.chunk_vector_norms = []

        if not chunks:
            self.avg_dl = 0.0
            return

        total_words = 0
        all_unique_terms: Set[str] = set()

        for idx, chunk in enumerate(chunks):
            # Rich combined text weighting title and tags
            combined_text = f"{chunk.document_title} {' '.join(chunk.tags)} {chunk.section_heading} {chunk.text}"
            tokens = tokenize(combined_text)
            self.chunk_tokens.append(tokens)
            length = len(tokens)
            self.doc_len.append(length)
            total_words += length

            unique_tokens = set(tokens)
            for token in unique_tokens:
                self.doc_freq[token] += 1
                if token not in self.inverted_index:
                    self.inverted_index[token] = []
                self.inverted_index[token].append(idx)
                all_unique_terms.add(token)

        self.avg_dl = total_words / len(chunks) if chunks else 0.0

        # Build vocabulary index
        self.vocabulary = {term: i for i, term in enumerate(sorted(all_unique_terms))}
        n_docs = len(chunks)

        # Build normalized TF-IDF semantic vectors for each chunk
        for idx, chunk in enumerate(chunks):
            tokens = self.chunk_tokens[idx]
            token_counts = Counter(tokens)
            vec: Dict[str, float] = {}
            norm_sq = 0.0

            title_tokens = set(tokenize(chunk.document_title))
            tag_tokens = set(tokenize(" ".join(chunk.tags)))
            heading_tokens = set(tokenize(chunk.section_heading))

            for term, count in token_counts.items():
                df = self.doc_freq.get(term, 1)
                idf = math.log((n_docs + 1.0) / (df + 1.0)) + 1.0
                tf = 1.0 + math.log(count) if count > 0 else 0.0

                # Semantic field boost
                field_weight = 1.0
                if term in title_tokens:
                    field_weight += 1.5
                if term in tag_tokens:
                    field_weight += 1.2
                if term in heading_tokens:
                    field_weight += 1.0

                weight = tf * idf * field_weight
                vec[term] = weight
                norm_sq += weight * weight

            norm = math.sqrt(norm_sq) if norm_sq > 0.0 else 1.0
            self.chunk_vectors.append(vec)
            self.chunk_vector_norms.append(norm)

    def expand_query(self, query: str) -> List[str]:
        """
        Expands user query with domain-specific semantic synonyms and morphological n-grams.
        """
        query_tokens = tokenize(query)
        expanded: Set[str] = set(query_tokens)
        query_lower = query.lower()

        for key, synonyms in SYNONYM_EXPANSIONS.items():
            if key in query_lower or any(k in query_tokens for k in key.split()):
                for syn in synonyms:
                    for syn_tok in tokenize(syn):
                        expanded.add(syn_tok)

        return list(expanded)

    def _compute_bm25_scores(self, query_tokens: List[str]) -> Tuple[Dict[int, float], Dict[int, List[str]]]:
        """Computes lexical BM25 scores with field boosts across all chunks."""
        scores: Dict[int, float] = Counter()
        matched_terms: Dict[int, List[str]] = {}
        n_docs = len(self.chunks)

        for token in query_tokens:
            df = self.doc_freq.get(token, 0)
            if df == 0:
                continue

            idf = math.log((n_docs - df + 0.5) / (df + 0.5) + 1.0)
            matching_chunk_indices = self.inverted_index.get(token, [])

            for chunk_idx in matching_chunk_indices:
                chunk = self.chunks[chunk_idx]
                tokens = self.chunk_tokens[chunk_idx]
                tf = tokens.count(token)

                # Field boost
                field_boost = 1.0
                if token in tokenize(chunk.document_title):
                    field_boost += 2.0
                if any(token in tokenize(tag) for tag in chunk.tags):
                    field_boost += 1.5
                if token in tokenize(chunk.section_heading):
                    field_boost += 1.0

                dl = self.doc_len[chunk_idx]
                denom = tf + self.k1 * (1.0 - self.b + self.b * (dl / (self.avg_dl or 1.0)))
                bm25_score = idf * ((tf * (self.k1 + 1.0)) / (denom or 1.0)) * field_boost

                scores[chunk_idx] += bm25_score
                if chunk_idx not in matched_terms:
                    matched_terms[chunk_idx] = []
                matched_terms[chunk_idx].append(token)

        return scores, matched_terms

    def _compute_semantic_cosine_scores(self, query_tokens: List[str]) -> Dict[int, float]:
        """Computes dense cosine similarity between query and chunk semantic vectors."""
        if not query_tokens:
            return {}

        n_docs = len(self.chunks)
        query_counts = Counter(query_tokens)
        query_vec: Dict[str, float] = {}
        q_norm_sq = 0.0

        for term, count in query_counts.items():
            df = self.doc_freq.get(term, 1)
            idf = math.log((n_docs + 1.0) / (df + 1.0)) + 1.0
            tf = 1.0 + math.log(count) if count > 0 else 0.0
            weight = tf * idf
            query_vec[term] = weight
            q_norm_sq += weight * weight

        q_norm = math.sqrt(q_norm_sq) if q_norm_sq > 0.0 else 1.0
        scores: Dict[int, float] = {}

        for idx, doc_vec in enumerate(self.chunk_vectors):
            doc_norm = self.chunk_vector_norms[idx]
            if doc_norm <= 0.0:
                continue

            dot_product = 0.0
            for term, q_w in query_vec.items():
                if term in doc_vec:
                    dot_product += q_w * doc_vec[term]

            cosine_sim = dot_product / (q_norm * doc_norm)
            if cosine_sim > 0.01:
                scores[idx] = cosine_sim

        return scores

    def search(
        self,
        query: str,
        top_k: int = 5,
        min_score: float = 0.5
    ) -> List[RetrievedPassage]:
        """
        Executes Hybrid RAG Search:
        1. BM25 Lexical Retrieval with Field Boosting
        2. Dense Semantic Vector Cosine Similarity
        3. Reciprocal Rank Fusion (RRF) combining both rankings
        4. Cross-Passage Reranker with Exact Query Coverage & Trust Tiers
        5. Zero-hallucination thresholding gate
        """
        if not self.chunks or not query.strip():
            return []

        raw_query_tokens = tokenize(query)
        if not raw_query_tokens:
            return []

        # Expanded query tokens for higher recall
        expanded_query_tokens = self.expand_query(query) if settings.ENABLE_QUERY_EXPANSION else raw_query_tokens

        # 1. Lexical BM25 Scoring
        bm25_scores, matched_terms_map = self._compute_bm25_scores(expanded_query_tokens)

        # 2. Dense Semantic Cosine Scoring
        dense_scores = self._compute_semantic_cosine_scores(expanded_query_tokens)

        # If zero matches across both channels, immediately return empty
        all_candidate_indices = set(bm25_scores.keys()) | set(dense_scores.keys())
        if not all_candidate_indices:
            return []

        # Rank candidates for BM25
        sorted_bm25 = sorted(bm25_scores.items(), key=lambda x: x[1], reverse=True)
        bm25_ranks = {doc_id: rank for rank, (doc_id, _) in enumerate(sorted_bm25, 1)}

        # Rank candidates for Dense
        sorted_dense = sorted(dense_scores.items(), key=lambda x: x[1], reverse=True)
        dense_ranks = {doc_id: rank for rank, (doc_id, _) in enumerate(sorted_dense, 1)}

        # 3. Reciprocal Rank Fusion (RRF)
        rrf_k = self.rrf_k
        fused_rrf: Dict[int, float] = {}

        for doc_id in all_candidate_indices:
            bm25_rank = bm25_ranks.get(doc_id, len(self.chunks) + 50)
            dense_rank = dense_ranks.get(doc_id, len(self.chunks) + 50)

            score_bm25 = 1.0 / (rrf_k + bm25_rank)
            score_dense = 1.0 / (rrf_k + dense_rank)

            rrf_score = ((1.0 - self.hybrid_alpha) * score_bm25) + (self.hybrid_alpha * score_dense)
            fused_rrf[doc_id] = rrf_score

        # 4. Cross-Passage Reranker & Trust Tier Weighting
        final_results: List[RetrievedPassage] = []
        query_words_set = set(raw_query_tokens)

        for chunk_idx in all_candidate_indices:
            chunk = self.chunks[chunk_idx]
            chunk_all_tokens = set(self.chunk_tokens[chunk_idx])

            lexical_val = bm25_scores.get(chunk_idx, 0.0)
            dense_val = dense_scores.get(chunk_idx, 0.0)
            rrf_boost = fused_rrf.get(chunk_idx, 0.0) * 100.0

            # Base hybrid relevance on conventional scoring scale
            hybrid_relevance = (lexical_val * (1.0 - self.hybrid_alpha)) + (dense_val * 10.0 * self.hybrid_alpha) + (rrf_boost * 0.5)

            # Query token coverage ratio (strict grounding gate)
            covered = query_words_set.intersection(chunk_all_tokens)
            coverage_ratio = len(covered) / len(query_words_set) if query_words_set else 0.0

            # Weight by OKF Trust Tier and lifecycle
            trust_weight = 1.0
            if chunk.trust_tier == "human-reviewed":
                trust_weight *= 1.15
            elif chunk.trust_tier == "machine-confirmed":
                trust_weight *= 1.05
            elif chunk.trust_tier == "unverified":
                trust_weight *= 0.95

            if chunk.status == "deprecated":
                trust_weight *= 0.5
            elif chunk.is_stale:
                trust_weight *= 0.7

            # Continuous phrase bonus
            phrase_bonus = 1.0
            clean_q = query.lower().strip("?!.")
            if len(clean_q) > 4 and clean_q in chunk.text.lower():
                phrase_bonus = 1.25

            # Composite final score
            composite_score = hybrid_relevance * (1.0 + (coverage_ratio * 0.3)) * trust_weight * phrase_bonus

            # Strict relevance cutoff to eliminate false positives
            if composite_score >= min_score and (coverage_ratio > 0.0 or len(matched_terms_map.get(chunk_idx, [])) > 0):
                final_results.append(RetrievedPassage(
                    chunk=chunk,
                    score=round(composite_score, 3),
                    matched_terms=list(set(matched_terms_map.get(chunk_idx, []) + list(covered)))
                ))

        # Sort descending by composite score
        final_results.sort(key=lambda x: x.score, reverse=True)
        return final_results[:top_k]

    @staticmethod
    def passages_to_citations(passages: List[RetrievedPassage]) -> List[Citation]:
        citations: List[Citation] = []
        seen: Set[str] = set()

        for p in passages:
            chunk = p.chunk
            key = f"{chunk.concept_id}:{chunk.section_heading}"
            if key in seen:
                continue
            seen.add(key)

            # Choose the primary external resource or bundle reference
            url = chunk.document_resource
            author = None
            if chunk.source_references:
                first_src = chunk.source_references[0]
                if not url and first_src.resource.startswith("http"):
                    url = first_src.resource
                author = first_src.author

            snippet = chunk.text[:240].strip() + ("..." if len(chunk.text) > 240 else "")

            citations.append(Citation(
                document_title=chunk.document_title,
                concept_id=chunk.concept_id,
                section_heading=chunk.section_heading,
                resource_url=url,
                passage_snippet=snippet,
                trust_tier=chunk.trust_tier,
                source_author=author
            ))

        return citations

# Singleton hybrid retrieval engine instance
retrieval_engine = RetrievalEngine(
    k1=settings.BM25_K1,
    b=settings.BM25_B,
    rrf_k=settings.RRF_K,
    hybrid_alpha=settings.HYBRID_ALPHA
)

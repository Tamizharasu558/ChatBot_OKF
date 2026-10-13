from __future__ import annotations
import logging
import re
from typing import Optional, List, Dict

from backend.app.core.config import settings
from backend.app.models.okf_models import ChatResponse, Citation
from backend.app.services.knowledge_loader import knowledge_loader
from backend.app.services.retrieval import retrieval_engine
from backend.app.services.llm_service import (
    get_llm_provider,
    build_prompt_messages,
    UNSUPPORTED_ANSWER_MESSAGE,
)
from backend.app.db.database import db

logger = logging.getLogger("chat_service")

class ChatService:
    @staticmethod
    async def process_chat(
        question: str,
        conversation_id: Optional[str] = None
    ) -> ChatResponse:
        clean_question = question.strip()
        if not clean_question:
            raise ValueError("Question cannot be empty.")

        # Ensure conversation exists
        if not conversation_id:
            title = clean_question[:36] + ("..." if len(clean_question) > 36 else "")
            conversation_id = db.create_conversation(title=title)

        # Store user message
        db.add_message(conversation_id=conversation_id, role="user", content=clean_question)

        # Check for conversational greeting or general catalog query
        lower_q = clean_question.lower().strip("?!. ")
        is_greeting = lower_q in {
            "hi", "hello", "hey", "greetings", "good morning", "good evening", "good afternoon"
        }
        is_catalog_inquiry = any(p in lower_q for p in [
            "what do you know", "what can you do", "what is in the knowledge base",
            "what topics", "list documents", "show documents", "available documents",
            "who are you", "help me", "how can you help", "what knowledge"
        ])

        if is_greeting or is_catalog_inquiry:
            overview = knowledge_loader.get_overview()
            docs_summary = "\n".join([
                f"- **{d.title}** (`{d.concept_id}`): {d.description or d.type}"
                for d in overview.documents
            ])
            answer = (
                f"Hello! I am your **OKF Knowledge Assistant**, providing answers grounded strictly in our Open Knowledge Format (OKF v0.2) bundle.\n\n"
                f"Here are the primary topics currently indexed in my knowledge catalog:\n\n"
                f"{docs_summary}\n\n"
                f"You can ask me specific questions such as:\n"
                f"- *\"What are the API rate limits for each tier?\"*\n"
                f"- *\"What is the refund policy for subscriptions?\"*\n"
                f"- *\"How is recognized company revenue computed?\"*\n"
                f"- *\"What are the data retention and log purge schedules?\"*\n"
                f"- *\"How does the order processing and fraud screening pipeline work?\"*\n\n"
                f"What would you like to know?"
            )
            citations = [
                Citation(
                    document_title=d.title,
                    concept_id=d.concept_id,
                    section_heading="Overview & Summary",
                    resource_url=d.resource,
                    passage_snippet=d.description or d.title,
                    trust_tier=d.trust_tier,
                    source_author=None
                )
                for d in overview.documents[:4]
            ]
            db.add_message(
                conversation_id=conversation_id,
                role="assistant",
                content=answer,
                sources=citations
            )
            return ChatResponse(
                answer=answer,
                sources=citations,
                conversation_id=conversation_id,
                retrieval_count=len(citations),
                confidence="grounded"
            )

        # Retrieve relevant passages from indexed OKF bundle
        retrieved_passages = retrieval_engine.search(
            query=clean_question,
            top_k=settings.MAX_RETRIEVAL_PASSAGES,
            min_score=settings.MIN_RELEVANCE_SCORE
        )

        # If knowledge base does not contain relevant information:
        if not retrieved_passages:
            answer = UNSUPPORTED_ANSWER_MESSAGE
            citations: List[Citation] = []
            confidence = "unsupported"

            db.add_message(
                conversation_id=conversation_id,
                role="assistant",
                content=answer,
                sources=citations
            )

            return ChatResponse(
                answer=answer,
                sources=citations,
                conversation_id=conversation_id,
                retrieval_count=0,
                confidence=confidence
            )

        # Grounded generation using LLM
        citations = retrieval_engine.passages_to_citations(retrieved_passages)

        # Fetch history turns for context
        history_msgs = db.get_conversation_messages(conversation_id)
        history_turns = [
            {"role": m.role, "content": m.content}
            for m in history_msgs[:-1]  # exclude the newly added user message
        ]

        prompt_messages = build_prompt_messages(
            query=clean_question,
            passages=retrieved_passages,
            history=history_turns
        )

        llm = get_llm_provider()
        try:
            answer = await llm.generate_response(prompt_messages)
            confidence = "grounded"
        except Exception as e:
            logger.error(f"Error calling LLM provider: {e}", exc_info=True)
            answer = (
                f"An error occurred while communicating with the language model provider ({settings.LLM_PROVIDER}): {str(e)}. "
                f"Please check your API configuration or verify that the local LLM service is running."
            )
            confidence = "fallback"

        # Record assistant reply in database
        db.add_message(
            conversation_id=conversation_id,
            role="assistant",
            content=answer,
            sources=citations
        )

        return ChatResponse(
            answer=answer,
            sources=citations,
            conversation_id=conversation_id,
            retrieval_count=len(retrieved_passages),
            confidence=confidence
        )

chat_service = ChatService()

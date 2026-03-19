from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
import os
from datetime import datetime

load_dotenv()

app = FastAPI(title="Alpharive Voice Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# In-memory session storage (no DB needed for demo)
sessions_store = []

SYSTEM_PROMPT = """
You are Aria, the AI voice assistant for Alpharive Tech Private Limited,
a technology company specializing in software development, AI solutions,
web applications, and digital transformation.

Your Goals:
- Welcome visitors warmly and understand their needs
- Explain Alpharive Tech's services clearly and concisely
- Answer FAQs about the company
- Qualify leads by asking for their name, company, and what they need
- Collect contact details (name, email or phone) if they want a follow-up
- End calls politely

Services Alpharive Tech offers:
- Custom software development (web, mobile, desktop)
- AI and machine learning solutions
- UI/UX design and prototyping
- Cloud infrastructure and DevOps
- IT consulting and digital strategy
- AI chatbots and voice assistants

Tone: Professional, warm, and concise. This is a voice call so keep each response to 2-3 sentences maximum.

Rules:
- Do not invent pricing, guarantees, or legal commitments
- If unsure, say you will note the request for a human team member to follow up
- Always ask for name and contact info if the user wants follow-up

Flow: Greet -> Understand need -> Answer -> Ask if they want follow-up -> Collect info -> Close warmly

Fallback phrase: "That's a great question. I'll make sure our team gets back to you on that. Can I take your name and contact details?"
"""


class SessionLog(BaseModel):
    session_id: str
    transcript: list
    outcome: str = "inquiry"


@app.get("/")
def health():
    return {"status": "ok", "service": "Alpharive Voice Bot API"}


@app.post("/session")
async def create_realtime_session():
    if not OPENAI_API_KEY or "paste-your" in OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured in .env file")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/realtime/sessions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-realtime-preview-2024-12-17",
                "voice": "alloy",
                "instructions": SYSTEM_PROMPT,
                "modalities": ["audio", "text"],
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 600,
                },
                "input_audio_transcription": {
                    "model": "whisper-1"
                }
            },
            timeout=20.0,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI error: {response.text}"
        )

    return response.json()


@app.post("/save-session")
async def save_session(log: SessionLog):
    sessions_store.append({
        "session_id": log.session_id,
        "transcript": log.transcript,
        "outcome": log.outcome,
        "created_at": datetime.utcnow().isoformat(),
    })
    return {"status": "saved", "total_sessions": len(sessions_store)}


@app.get("/sessions")
async def get_sessions():
    return sessions_store[-20:]
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import twin, simulate, commander, voice, route, alert
from ai.rag import rag_system
from ai.commander import GENAI_AVAILABLE
from ai.rag import SENTENCE_TRANSFORMERS_AVAILABLE

app = FastAPI(title="DisasterTwin AI Backend")

# Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    print("Initializing Knowledge RAG...")
    try:
        rag_system.initialize()
        print("Knowledge RAG initialized.")
    except Exception as e:
        print(f"Failed to initialize RAG: {e}")

app.include_router(twin.router, prefix="/api", tags=["twin"])
app.include_router(simulate.router, prefix="/api", tags=["simulate"])
app.include_router(commander.router, prefix="/api", tags=["commander"])
app.include_router(voice.router, prefix="/api", tags=["voice"])
app.include_router(route.router, prefix="/api", tags=["route"])
app.include_router(alert.router, prefix="/api", tags=["alert"])

@app.get("/api/health")
def health_check():
    gemini_key = bool(os.getenv("GEMINI_API_KEY"))
    elevenlabs_key = bool(os.getenv("ELEVENLABS_API_KEY"))
    
    demo_mode = not GENAI_AVAILABLE or not gemini_key or not SENTENCE_TRANSFORMERS_AVAILABLE
    
    return {
        "status": "ok",
        "demo_mode": demo_mode,
        "features": {
            "gemini_available": GENAI_AVAILABLE and gemini_key,
            "elevenlabs_available": elevenlabs_key,
            "sentence_transformers_available": SENTENCE_TRANSFORMERS_AVAILABLE,
            "rag_initialized": rag_system.index is not None or rag_system.is_demo
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

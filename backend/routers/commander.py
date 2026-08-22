from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from ai.commander import ask
from data.city_model import get_initial_city_state
from engine.risk_engine import compute_city_risks

router = APIRouter()

class CommanderRequest(BaseModel):
    question: Optional[str] = None
    message: Optional[str] = None
    prompt: Optional[str] = None
    language: Optional[str] = "en"
    area: Optional[str] = "chennai"
    origin_location: Optional[str] = None

@router.post("/commander")
async def commander_ask(req: CommanderRequest):
    query_text = req.question or req.message or req.prompt or "Where is the highest flood risk?"
    
    zones = get_initial_city_state(req.area or "chennai")
    compute_city_risks(zones)
    twin_state = {"zones": [z.model_dump() for z in zones]}

    result = await ask(query_text, twin_state, language=req.language or "en", origin_location=req.origin_location)
    
    # Ensure standard response schema
    if "mode" not in result:
        result["mode"] = "demo" if result.get("is_demo", True) else "gemini"
    if "sources" not in result:
        result["sources"] = []
        
    return result

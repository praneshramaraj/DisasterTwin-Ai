from fastapi import APIRouter, Request
from fastapi.responses import Response, JSONResponse
from ai.briefing import generate_briefing
from voice.elevenlabs import generate_audio
from data.city_model import get_initial_city_state
from engine.risk_engine import compute_city_risks

router = APIRouter()

@router.post("/voice")
async def voice_briefing(request: Request):
    print("VOICE REQUEST RECEIVED")

    language = "en"
    try:
        body = await request.json()
        language = body.get("language", "en")
    except Exception:
        pass

    zones = get_initial_city_state()
    compute_city_risks(zones)
    twin_state = {"zones": [z.model_dump() for z in zones]}

    briefing_text = generate_briefing(twin_state, language=language)
    audio_bytes = await generate_audio(briefing_text, language=language)

    if audio_bytes:
        print("RETURNING AUDIO/MPEG RESPONSE")
        return Response(content=audio_bytes, media_type="audio/mpeg")
    else:
        print(f"RETURNING JSON DEMO RESPONSE (Language: {language})")
        return JSONResponse(
            content={
                "briefing_text": briefing_text,
                "demo_mode": True,
                "language": language,
                "status": "demo_fallback"
            },
            status_code=200
        )

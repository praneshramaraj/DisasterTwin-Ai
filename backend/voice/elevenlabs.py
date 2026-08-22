import os
import httpx
from typing import Optional

async def generate_audio(text: str, language: str = "en") -> Optional[bytes]:
    api_key = os.getenv("ELEVENLABS_API_KEY")
    is_configured = bool(api_key and api_key.strip())

    print(f"ELEVENLABS CONFIGURED: {is_configured} (Language: {language})")

    if not is_configured:
        return None

    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Default: Rachel
    model_id = "eleven_multilingual_v2" if language == "ta" else os.getenv("ELEVENLABS_MODEL_ID", "eleven_monolingual_v1")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key.strip()
    }

    data = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }

    print("ELEVENLABS REQUEST STARTED")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=data, headers=headers)
            print(f"ELEVENLABS RESPONSE STATUS: {response.status_code}")
            if response.status_code == 200:
                print("AUDIO GENERATED: TRUE")
                return response.content
            else:
                print(f"AUDIO GENERATED: FALSE (Status {response.status_code})")
                return None
    except Exception as e:
        print(f"ElevenLabs API Exception: {e}")
        print("AUDIO GENERATED: FALSE")
        return None

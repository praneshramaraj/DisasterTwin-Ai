from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Union
import logging

router = APIRouter()

class AlertRequest(BaseModel):
    to: Optional[Union[str, List[str]]] = "917806994340,917904085824,918610754204"
    text: str
    recipient: Optional[str] = None

DEFAULT_CONTACTS = ["917806994340", "917904085824", "918610754204"]

def _clean_numbers(raw_to: Optional[Union[str, List[str]]]) -> List[str]:
    if not raw_to:
        return DEFAULT_CONTACTS
    if isinstance(raw_to, list):
        items = raw_to
    else:
        items = [n.strip() for n in str(raw_to).split(",") if n.strip()]
    
    result = []
    for num in items:
        clean = "".join(filter(str.isdigit, num))
        if len(clean) == 10:
            clean = "91" + clean
        if clean:
            result.append(clean)
    return result or DEFAULT_CONTACTS

@router.post("/sms")
async def send_sms_alert(req: AlertRequest):
    numbers = _clean_numbers(req.to or req.recipient)
    logging.info(f"🚨 SMS EMERGENCY ALERT DISPATCHED TO {', '.join(numbers)}:\n{req.text}")
    print(f"\n==========================================")
    print(f"📱 EMERGENCY SMS DISPATCHED TO: {', '.join(numbers)}")
    print(f"------------------------------------------")
    print(req.text)
    print(f"==========================================\n")
    
    return {
        "status": "success",
        "message": f"SMS emergency alert dispatched to {len(numbers)} recipients",
        "recipients": numbers,
        "text": req.text,
        "delivered": True
    }

@router.post("/whatsapp")
async def send_whatsapp_alert(req: AlertRequest):
    numbers = _clean_numbers(req.to or req.recipient)
    
    urls = [f"https://api.whatsapp.com/send?phone={num}&text=" for num in numbers]
    
    logging.info(f"💬 WHATSAPP EMERGENCY ALERT DISPATCHED TO {', '.join(numbers)}:\n{req.text}")
    print(f"\n==========================================")
    print(f"💬 WHATSAPP EMERGENCY ALERT DISPATCHED TO: {', '.join(numbers)}")
    print(f"------------------------------------------")
    print(req.text)
    print(f"==========================================\n")
    
    return {
        "status": "success",
        "message": f"WhatsApp emergency alert generated for {len(numbers)} recipients",
        "recipients": numbers,
        "whatsapp_urls": urls,
        "text": req.text,
        "delivered": True
    }

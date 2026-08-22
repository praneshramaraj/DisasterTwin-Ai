from fastapi import APIRouter
from typing import Optional
from data.city_model import get_initial_city_state
from engine.risk_engine import compute_city_risks

router = APIRouter()

@router.get("/twin")
@router.get("/twin/state")
@router.get("/state")
def get_twin_state(area: Optional[str] = "chennai"):
    zones = get_initial_city_state(area=area)
    compute_city_risks(zones)
    return {"zones": [z.model_dump() for z in zones], "area": area}

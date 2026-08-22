from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from engine.simulator import run_simulation

router = APIRouter()

class SimulationRequest(BaseModel):
    rainfall_mm: Optional[float] = 50.0
    water_level_m: Optional[float] = 0.3
    blocked_roads: Optional[List[str]] = []
    rescue_teams_available: Optional[int] = 10
    shelter_capacity_modifier: Optional[float] = 1.0
    area: Optional[str] = "chennai"

@router.post("/simulate")
def simulate(req: SimulationRequest):
    result = run_simulation(
        req.rainfall_mm if req.rainfall_mm is not None else 50.0,
        req.water_level_m if req.water_level_m is not None else 0.3,
        req.blocked_roads or [],
        req.rescue_teams_available if req.rescue_teams_available is not None else 10,
        req.shelter_capacity_modifier if req.shelter_capacity_modifier is not None else 1.0,
        area=req.area or "chennai"
    )
    return result

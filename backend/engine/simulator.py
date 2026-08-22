from data.city_model import Zone, get_initial_city_state
from engine.risk_engine import compute_city_risks
from typing import List, Dict, Any

def run_simulation(rainfall_mm: float, water_level_m: float, blocked_roads: List[str], rescue_teams_available: int, shelter_capacity_modifier: float, area: str = "chennai") -> Dict[str, Any]:
    # Start from fresh state for selected area
    zones = get_initial_city_state(area=area)

    affected_zones = []
    total_affected_pop = 0

    # Clean blocked roads matching set
    blocked_set = set(b.strip().lower() for b in blocked_roads if b)

    for z in zones:
        # Apply rainfall surge
        z.rainfall_mm += rainfall_mm

        # Elevation affects water level accumulation
        elevation_factor = max(0.1, (500 - z.elevation_m) / 500.0)
        drainage_eff = z.drainage_capacity

        water_increase = water_level_m * elevation_factor * (1.1 - drainage_eff)
        z.current_water_level_m += water_increase

        # Update Roads Status
        for r in z.roads:
            r_id = r.id.lower()
            r_name = r.name.lower()

            # Check if road is explicitly blocked by user input
            is_explicitly_blocked = (
                r_id in blocked_set or
                r_name in blocked_set or
                any(b in r_id or b in r_name for b in blocked_set) or
                ("route a" in blocked_set and r_id == "r1") or
                ("route b" in blocked_set and r_id == "r2") or
                ("route c" in blocked_set and r_id == "r3")
            )

            if is_explicitly_blocked:
                r.status = "blocked"
                r.flood_depth_m = max(r.flood_depth_m, 1.2)
            elif z.current_water_level_m > 0.4:
                r.status = "flooded"
                r.flood_depth_m = max(r.flood_depth_m, z.current_water_level_m)
            else:
                r.status = "open"

        # Shelters
        for s in z.shelters:
            s.capacity = int(s.capacity * shelter_capacity_modifier)

    compute_city_risks(zones)

    for z in zones:
        if z.risk_level in ["HIGH", "CRITICAL"]:
            affected_zones.append(z.name)
            total_affected_pop += z.population

    # Estimate evacuation time
    evac_time = 0
    if total_affected_pop > 0:
        evac_rate_per_hour = 10000 + (rescue_teams_available * 1000)
        evac_time = total_affected_pop / evac_rate_per_hour

    return {
        "twin_state": {"zones": [z.model_dump() for z in zones]},
        "affected_zones": affected_zones,
        "total_affected_population": total_affected_pop,
        "estimated_evacuation_time_hours": round(evac_time, 2),
        "area": area,
        "resource_requirements": {
            "boats": max(4, len(affected_zones) * 6),
            "personnel": max(20, len(affected_zones) * 18),
            "shelters_needed": max(1, total_affected_pop // 500) if total_affected_pop > 0 else 0,
            "medical_teams": max(2, len(affected_zones) * 3),
        },
        "recommendations": [
            f"Immediately evacuate {', '.join(affected_zones[:3])}" if affected_zones else "Monitor situation closely",
            f"Deploy {max(4, len(affected_zones) * 6)} boats across affected areas" if affected_zones else "Keep rescue teams on standby",
            "Activate emergency shelters in high risk zones" if affected_zones else "Pre-position shelter supplies",
            f"Estimated clearance time: {round(evac_time, 1)} hours — station medical teams at shelters" if evac_time > 0 else "No immediate evacuation needed",
            "Monitor water levels continuously — conditions may deteriorate rapidly",
        ]
    }

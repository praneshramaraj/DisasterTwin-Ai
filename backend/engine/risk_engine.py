from typing import Tuple, Dict

def calculate_risk(zone) -> Tuple[float, str, Dict[str, float]]:
    # rainfall_intensity (weight 0.20): normalized 0-300mm
    r_factor = min(zone.rainfall_mm / 300.0, 1.0) * 0.20
    
    # water_level (weight 0.25): normalized 0-3m
    w_factor = min(zone.current_water_level_m / 3.0, 1.0) * 0.25
    
    # population_exposure (weight 0.15): population/max_pop (assume max 300000)
    p_factor = min(zone.population / 300000.0, 1.0) * 0.15
    
    # vulnerable_ratio (weight 0.15): vulnerable/total
    v_ratio = (zone.vulnerable_population / zone.population) if zone.population > 0 else 0
    v_factor = v_ratio * 0.15
    
    # road_accessibility (weight 0.10): inverted % roads blocked
    blocked_roads = sum(1 for r in zone.roads if r.status in ["blocked", "flooded"])
    total_roads = len(zone.roads)
    road_block_ratio = blocked_roads / total_roads if total_roads > 0 else 0
    road_factor = road_block_ratio * 0.10
    
    # infrastructure_risk (weight 0.10): hospital/shelter flood exposure
    avg_infra_risk = 0.0
    if zone.hospitals:
        avg_infra_risk = sum(h.flood_risk for h in zone.hospitals) / len(zone.hospitals)
    infra_factor = avg_infra_risk * 0.10
    
    # drainage_capacity (weight 0.05): inverted
    drain_factor = (1.0 - zone.drainage_capacity) * 0.05
    
    total_risk = r_factor + w_factor + p_factor + v_factor + road_factor + infra_factor + drain_factor
    
    level = "LOW"
    if total_risk >= 0.7:
        level = "CRITICAL"
    elif total_risk >= 0.5:
        level = "HIGH"
    elif total_risk >= 0.3:
        level = "MEDIUM"
        
    factors = {
        "rainfall_intensity": r_factor,
        "water_level": w_factor,
        "population_exposure": p_factor,
        "vulnerable_ratio": v_factor,
        "road_accessibility": road_factor,
        "infrastructure_risk": infra_factor,
        "drainage_capacity_inverted": drain_factor
    }
    
    return total_risk, level, factors

def compute_city_risks(zones):
    for z in zones:
        risk, level, factors = calculate_risk(z)
        z.risk_score = risk
        z.risk_level = level
        z.risk_factors = factors

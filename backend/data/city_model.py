from pydantic import BaseModel
from typing import List, Optional, Dict

class Hospital(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    capacity: int
    operational: bool
    flood_risk: float

class Shelter(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    capacity: int
    current_occupancy: int
    supplies_days: int

class Road(BaseModel):
    id: str
    name: str
    from_zone: str
    to_zone: str
    status: str
    flood_depth_m: float
    is_evacuation_route: bool
    road_type: Optional[str] = "Main Road"
    coordinates: List[List[float]]

class RescueTeam(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    personnel: int
    boats: int
    status: str
    assigned_zone: Optional[str]

class Zone(BaseModel):
    id: str
    name: str
    polygon: List[List[float]]
    population: int
    vulnerable_population: int
    elevation_m: float
    drainage_capacity: float
    current_water_level_m: float
    rainfall_mm: float
    hospitals: List[Hospital]
    shelters: List[Shelter]
    roads: List[Road]
    rescue_teams: List[RescueTeam]
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    risk_factors: Optional[Dict[str, float]] = None

REGION_PROFILES = {
    "chennai": {"name": "Chennai", "scenario": "Urban Flood / Cyclone", "center": [12.9800, 80.2000], "zoom": 11},
    "palani": {"name": "Palani", "scenario": "Heavy Rain / Landslide Risk", "center": [10.4500, 77.5200], "zoom": 13},
    "coimbatore": {"name": "Coimbatore", "scenario": "Urban Flood / Heavy Rain", "center": [11.0168, 76.9558], "zoom": 12},
    "madurai": {"name": "Madurai", "scenario": "Urban Flood / Extreme Rainfall", "center": [9.9252, 78.1198], "zoom": 12},
    "cuddalore": {"name": "Cuddalore", "scenario": "Coastal Flood / Cyclone", "center": [11.7480, 79.7714], "zoom": 12},
    "thoothukudi": {"name": "Thoothukudi", "scenario": "Coastal Flood / Cyclone Surge", "center": [8.7642, 78.1348], "zoom": 12}
}

def get_initial_city_state(area: str = "chennai") -> List[Zone]:
    area_clean = area.strip().lower() if area else "chennai"

    if area_clean == "palani":
        return _get_palani_state()
    elif area_clean == "coimbatore":
        return _get_coimbatore_state()
    elif area_clean == "madurai":
        return _get_madurai_state()
    elif area_clean == "cuddalore":
        return _get_cuddalore_state()
    elif area_clean == "thoothukudi":
        return _get_thoothukudi_state()

    return _get_chennai_state()

import math

# Helper to create realistic, organic, undefined flood inundation shapes (12 irregular vertices)
def _poly(lat: float, lng: float, size: float = 0.010, seed: int = 1, **kwargs) -> List[List[float]]:
    points = []
    num_vertices = 12
    actual_size = 0.010
    for i in range(num_vertices):
        angle = (2 * math.pi * i) / num_vertices
        radius_modifier = 1.0 + 0.35 * math.sin(3 * angle + seed) + 0.20 * math.cos(5 * angle - seed)
        r_lat = actual_size * radius_modifier * 0.85
        r_lng = actual_size * radius_modifier * 1.15
        
        pt_lat = lat + r_lat * math.sin(angle)
        pt_lng = lng + r_lng * math.cos(angle)
        points.append([round(pt_lat, 6), round(pt_lng, 6)])
    return points

def _get_chennai_state() -> List[Zone]:
    return [
        Zone(
            id="Z1", name="Adyar", polygon=_poly(13.008, 80.260, water_m=0.2, rain_mm=10.0, seed=1),
            population=120000, vulnerable_population=21600, elevation_m=4.5, drainage_capacity=0.7, current_water_level_m=0.2, rainfall_mm=10.0,
            hospitals=[Hospital(id="H1", name="Adyar Fortis Hospital", lat=13.008, lng=80.260, capacity=200, operational=True, flood_risk=0.2)],
            shelters=[Shelter(id="S1", name="Adyar School Shelter", lat=13.010, lng=80.265, capacity=500, current_occupancy=120, supplies_days=5)],
            roads=[Road(id="R1", name="Adyar Bridge Highway", from_zone="Z1", to_zone="Z4", status="open", flood_depth_m=0.1, is_evacuation_route=True, road_type="Highway", coordinates=[[13.008, 80.258], [13.012, 80.261], [13.016, 80.264], [13.020, 80.268]])],
            rescue_teams=[RescueTeam(id="RT1", name="NDRF Team Alpha", lat=13.005, lng=80.260, personnel=25, boats=5, status="standby", assigned_zone="Z1")]
        ),
        Zone(
            id="Z2", name="Velachery", polygon=_poly(12.980, 80.220, water_m=0.8, rain_mm=120.0, seed=2),
            population=150000, vulnerable_population=27000, elevation_m=2.0, drainage_capacity=0.4, current_water_level_m=0.8, rainfall_mm=120.0,
            hospitals=[Hospital(id="H2", name="Prashanth Speciality", lat=12.980, lng=80.220, capacity=150, operational=True, flood_risk=0.6)],
            shelters=[Shelter(id="S2", name="Velachery Aquatic Shelter", lat=12.985, lng=80.225, capacity=1000, current_occupancy=350, supplies_days=3)],
            roads=[Road(id="R2", name="Velachery Main Road", from_zone="Z2", to_zone="Z5", status="flooded", flood_depth_m=0.6, is_evacuation_route=True, road_type="Main Road", coordinates=[[12.978, 80.218], [12.982, 80.221], [12.988, 80.223], [12.994, 80.216], [13.000, 80.210]])],
            rescue_teams=[RescueTeam(id="RT2", name="SDRF Team Bravo", lat=12.985, lng=80.220, personnel=30, boats=10, status="active", assigned_zone="Z2")]
        ),
        Zone(
            id="Z3", name="T. Nagar", polygon=_poly(13.038, 80.234, water_m=0.1, rain_mm=5.0, seed=3),
            population=200000, vulnerable_population=36000, elevation_m=6.0, drainage_capacity=0.5, current_water_level_m=0.1, rainfall_mm=5.0,
            hospitals=[Hospital(id="H3", name="Apollo T. Nagar", lat=13.035, lng=80.235, capacity=300, operational=True, flood_risk=0.1)],
            shelters=[Shelter(id="S3", name="T. Nagar Govt Shelter", lat=13.040, lng=80.240, capacity=800, current_occupancy=40, supplies_days=7)],
            roads=[Road(id="R3", name="Usman Road Flyover", from_zone="Z3", to_zone="Z4", status="open", flood_depth_m=0.0, is_evacuation_route=False, road_type="Secondary Road", coordinates=[[13.032, 80.232], [13.036, 80.237], [13.039, 80.244], [13.030, 80.260]])],
            rescue_teams=[RescueTeam(id="RT3", name="Local Rescue Charlie", lat=13.035, lng=80.240, personnel=15, boats=2, status="standby", assigned_zone="Z3")]
        ),
        Zone(
            id="Z4", name="Mylapore", polygon=_poly(13.030, 80.270, water_m=0.1, rain_mm=10.0, seed=4),
            population=110000, vulnerable_population=19800, elevation_m=5.0, drainage_capacity=0.6, current_water_level_m=0.1, rainfall_mm=10.0,
            hospitals=[Hospital(id="H4", name="Isabel Hospital", lat=13.030, lng=80.270, capacity=100, operational=True, flood_risk=0.2)],
            shelters=[Shelter(id="S4", name="Mylapore Shelter", lat=13.025, lng=80.275, capacity=600, current_occupancy=10, supplies_days=4)],
            roads=[Road(id="R4", name="RK Salai Expressway", from_zone="Z4", to_zone="Z1", status="open", flood_depth_m=0.1, is_evacuation_route=True, road_type="Highway", coordinates=[[13.038, 80.278], [13.035, 80.271], [13.028, 80.267], [13.015, 80.265]])],
            rescue_teams=[RescueTeam(id="RT4", name="NDRF Team Delta", lat=13.030, lng=80.270, personnel=20, boats=4, status="standby", assigned_zone="Z4")]
        ),
        Zone(
            id="Z5", name="Guindy", polygon=_poly(13.010, 80.210, water_m=0.05, rain_mm=5.0, seed=5),
            population=90000, vulnerable_population=16200, elevation_m=7.0, drainage_capacity=0.8, current_water_level_m=0.05, rainfall_mm=5.0,
            hospitals=[Hospital(id="H5", name="Guindy GH", lat=13.010, lng=80.210, capacity=250, operational=True, flood_risk=0.1)],
            shelters=[Shelter(id="S5", name="Guindy Relief Center", lat=13.015, lng=80.215, capacity=1500, current_occupancy=50, supplies_days=10)],
            roads=[Road(id="R5", name="Mount Road GST Arterial", from_zone="Z5", to_zone="Z3", status="open", flood_depth_m=0.0, is_evacuation_route=True, road_type="Highway", coordinates=[[13.005, 80.205], [13.012, 80.213], [13.021, 80.222], [13.030, 80.230]])],
            rescue_teams=[RescueTeam(id="RT5", name="SDRF Team Echo", lat=13.010, lng=80.210, personnel=35, boats=8, status="standby", assigned_zone="Z5")]
        ),
        Zone(
            id="Z6", name="Madipakkam", polygon=_poly(12.965, 80.198, water_m=0.6, rain_mm=25.0, seed=6),
            population=135000, vulnerable_population=24300, elevation_m=1.8, drainage_capacity=0.35, current_water_level_m=0.6, rainfall_mm=25.0,
            hospitals=[Hospital(id="H6", name="Kamakshi Memorial", lat=12.962, lng=80.198, capacity=180, operational=True, flood_risk=0.5)],
            shelters=[Shelter(id="S6", name="Madipakkam Center", lat=12.965, lng=80.202, capacity=850, current_occupancy=20, supplies_days=4)],
            roads=[Road(id="R6", name="Madipakkam Lake Road", from_zone="Z6", to_zone="Z2", status="flooded", flood_depth_m=0.4, is_evacuation_route=True, road_type="Main Road", coordinates=[[12.958, 80.192], [12.964, 80.199], [12.970, 80.206], [12.975, 80.215]])],
            rescue_teams=[RescueTeam(id="RT6", name="SDRF Team Golf", lat=12.962, lng=80.195, personnel=25, boats=6, status="active", assigned_zone="Z6")]
        ),
        Zone(
            id="Z7", name="Perumbakkam", polygon=_poly(12.900, 80.192, water_m=0.7, rain_mm=30.0, seed=7),
            population=160000, vulnerable_population=32000, elevation_m=1.5, drainage_capacity=0.3, current_water_level_m=0.7, rainfall_mm=30.0,
            hospitals=[Hospital(id="H7", name="Gleneagles Global Hospital", lat=12.900, lng=80.192, capacity=350, operational=True, flood_risk=0.4)],
            shelters=[Shelter(id="S7", name="Perumbakkam Camp", lat=12.905, lng=80.198, capacity=1800, current_occupancy=80, supplies_days=6)],
            roads=[Road(id="R7", name="Perumbakkam Link Road", from_zone="Z7", to_zone="Z8", status="flooded", flood_depth_m=0.5, is_evacuation_route=True, road_type="Secondary Road", coordinates=[[12.892, 80.182], [12.898, 80.194], [12.904, 80.208], [12.900, 80.220]])],
            rescue_teams=[RescueTeam(id="RT7", name="NDRF Team Hotel", lat=12.902, lng=80.188, personnel=30, boats=8, status="active", assigned_zone="Z7")]
        ),
        Zone(
            id="Z8", name="Sholinganallur", polygon=_poly(12.901, 80.228),
            population=175000, vulnerable_population=31500, elevation_m=2.2, drainage_capacity=0.45, current_water_level_m=0.5, rainfall_mm=40.0,
            hospitals=[Hospital(id="H8", name="Apollo Cradle Sholinganallur", lat=12.901, lng=80.228, capacity=220, operational=True, flood_risk=0.3)],
            shelters=[Shelter(id="S8", name="IT Corridor Cyclone Shelter", lat=12.905, lng=80.230, capacity=2200, current_occupancy=180, supplies_days=8)],
            roads=[Road(id="R8", name="OMR IT Expressway", from_zone="Z8", to_zone="Z1", status="open", flood_depth_m=0.2, is_evacuation_route=True, road_type="Highway", coordinates=[[12.895, 80.225], [12.905, 80.232], [12.915, 80.240], [12.930, 80.250]])],
            rescue_teams=[RescueTeam(id="RT8", name="OMR Rescue Unit", lat=12.902, lng=80.229, personnel=35, boats=7, status="active", assigned_zone="Z8")]
        ),
        Zone(
            id="Z9", name="Tambaram", polygon=_poly(12.925, 80.117),
            population=220000, vulnerable_population=39600, elevation_m=8.5, drainage_capacity=0.75, current_water_level_m=0.1, rainfall_mm=15.0,
            hospitals=[Hospital(id="H9", name="Hindu Mission Hospital", lat=12.925, lng=80.117, capacity=400, operational=True, flood_risk=0.1)],
            shelters=[Shelter(id="S9", name="Tambaram Airbase Relief Hub", lat=12.928, lng=80.120, capacity=3500, current_occupancy=90, supplies_days=12)],
            roads=[Road(id="R9", name="GST Southern Highway", from_zone="Z9", to_zone="Z5", status="open", flood_depth_m=0.0, is_evacuation_route=True, road_type="Highway", coordinates=[[12.920, 80.110], [12.935, 80.130], [12.955, 80.155], [12.980, 80.180]])],
            rescue_teams=[RescueTeam(id="RT9", name="Air Force Rescue Command", lat=12.926, lng=80.118, personnel=50, boats=12, status="standby", assigned_zone="Z9")]
        ),
        Zone(
            id="Z10", name="Porur", polygon=_poly(13.038, 80.156),
            population=140000, vulnerable_population=25200, elevation_m=5.5, drainage_capacity=0.55, current_water_level_m=0.3, rainfall_mm=20.0,
            hospitals=[Hospital(id="H10", name="Sri Ramachandra Hospital", lat=13.038, lng=80.156, capacity=800, operational=True, flood_risk=0.2)],
            shelters=[Shelter(id="S10", name="Porur Lake View Shelter", lat=13.041, lng=80.160, capacity=1400, current_occupancy=60, supplies_days=6)],
            roads=[Road(id="R10", name="Mount-Poonamallee Road", from_zone="Z10", to_zone="Z3", status="open", flood_depth_m=0.1, is_evacuation_route=True, road_type="Main Road", coordinates=[[13.030, 80.145], [13.038, 80.156], [13.042, 80.175], [13.045, 80.200]])],
            rescue_teams=[RescueTeam(id="RT10", name="SRMC Emergency Response", lat=13.039, lng=80.157, personnel=28, boats=4, status="standby", assigned_zone="Z10")]
        )
    ]

def _get_palani_state() -> List[Zone]:
    return [
        Zone(
            id="P1", name="Palani Town", polygon=_poly(10.450, 77.520),
            population=110000, vulnerable_population=19800, elevation_m=312.0, drainage_capacity=0.5, current_water_level_m=0.4, rainfall_mm=45.0,
            hospitals=[Hospital(id="PH1", name="Palani Government GH", lat=10.448, lng=77.518, capacity=250, operational=True, flood_risk=0.3)],
            shelters=[Shelter(id="PS1", name="Palani Devasthanam Mandapam", lat=10.452, lng=77.522, capacity=1500, current_occupancy=100, supplies_days=8)],
            roads=[Road(id="PR1", name="Palani-Dindigul Highway", from_zone="P1", to_zone="P4", status="open", flood_depth_m=0.1, is_evacuation_route=True, road_type="Highway", coordinates=[[10.444, 77.514], [10.450, 77.520], [10.455, 77.530], [10.462, 77.545]])],
            rescue_teams=[RescueTeam(id="PRT1", name="SDRF Palani Team Alpha", lat=10.449, lng=77.519, personnel=30, boats=6, status="active", assigned_zone="P1")]
        ),
        Zone(
            id="P2", name="Adivaram", polygon=_poly(10.462, 77.525),
            population=85000, vulnerable_population=15300, elevation_m=340.0, drainage_capacity=0.6, current_water_level_m=0.6, rainfall_mm=60.0,
            hospitals=[Hospital(id="PH2", name="Subramaniam Hospital", lat=10.460, lng=77.522, capacity=120, operational=True, flood_risk=0.4)],
            shelters=[Shelter(id="PS2", name="Adivaram Pilgrim Shelter", lat=10.463, lng=77.525, capacity=2000, current_occupancy=250, supplies_days=10)],
            roads=[Road(id="PR2", name="Giri Veedhi Main Road", from_zone="P2", to_zone="P3", status="flooded", flood_depth_m=0.4, is_evacuation_route=True, road_type="Main Road", coordinates=[[10.457, 77.517], [10.462, 77.523], [10.466, 77.529], [10.470, 77.535]])],
            rescue_teams=[RescueTeam(id="PRT2", name="NDRF Hill Rescue Bravo", lat=10.461, lng=77.521, personnel=25, boats=8, status="active", assigned_zone="P2")]
        ),
        Zone(
            id="P3", name="Giri Veedhi", polygon=_poly(10.465, 77.528),
            population=60000, vulnerable_population=10800, elevation_m=365.0, drainage_capacity=0.65, current_water_level_m=0.3, rainfall_mm=55.0,
            hospitals=[Hospital(id="PH3", name="Hilltop Clinic", lat=10.466, lng=77.529, capacity=80, operational=True, flood_risk=0.2)],
            shelters=[Shelter(id="PS3", name="Giri Veedhi Annadhanam Hall", lat=10.467, lng=77.530, capacity=1800, current_occupancy=120, supplies_days=9)],
            roads=[Road(id="PR3", name="Temple Ropeway Bypass", from_zone="P3", to_zone="P1", status="open", flood_depth_m=0.0, is_evacuation_route=True, road_type="Secondary Road", coordinates=[[10.465, 77.527], [10.460, 77.524], [10.452, 77.521]])],
            rescue_teams=[RescueTeam(id="PRT3", name="Temple Security Rescue", lat=10.466, lng=77.528, personnel=20, boats=2, status="standby", assigned_zone="P3")]
        ),
        Zone(
            id="P4", name="Neikkarapatti", polygon=_poly(10.440, 77.480),
            population=45000, vulnerable_population=8100, elevation_m=295.0, drainage_capacity=0.45, current_water_level_m=0.2, rainfall_mm=30.0,
            hospitals=[Hospital(id="PH4", name="Neikkarapatti PHC", lat=10.440, lng=77.480, capacity=60, operational=True, flood_risk=0.2)],
            shelters=[Shelter(id="PS4", name="Neikkarapatti Govt School", lat=10.442, lng=77.482, capacity=800, current_occupancy=30, supplies_days=5)],
            roads=[Road(id="PR4", name="Kodaikanal Ghat Road", from_zone="P4", to_zone="P1", status="open", flood_depth_m=0.1, is_evacuation_route=True, road_type="Highway", coordinates=[[10.435, 77.475], [10.440, 77.485], [10.448, 77.505]])],
            rescue_teams=[RescueTeam(id="PRT4", name="Ghat Patrol Team", lat=10.441, lng=77.481, personnel=18, boats=2, status="standby", assigned_zone="P4")]
        ),
        Zone(
            id="P5", name="Ayakudi", polygon=_poly(10.448, 77.565),
            population=52000, vulnerable_population=9360, elevation_m=305.0, drainage_capacity=0.5, current_water_level_m=0.5, rainfall_mm=50.0,
            hospitals=[Hospital(id="PH5", name="Ayakudi Community Hospital", lat=10.448, lng=77.565, capacity=75, operational=True, flood_risk=0.3)],
            shelters=[Shelter(id="PS5", name="Ayakudi Guava Farmers Mandapam", lat=10.450, lng=77.568, capacity=1000, current_occupancy=70, supplies_days=7)],
            roads=[Road(id="PR5", name="Palani-Oddanchatram Arterial", from_zone="P5", to_zone="P1", status="flooded", flood_depth_m=0.3, is_evacuation_route=True, road_type="Main Road", coordinates=[[10.445, 77.555], [10.448, 77.565], [10.452, 77.580]])],
            rescue_teams=[RescueTeam(id="PRT5", name="Ayakudi Rural Rescue", lat=10.449, lng=77.566, personnel=22, boats=4, status="active", assigned_zone="P5")]
        ),
        Zone(
            id="P6", name="Balakrishnapuram", polygon=_poly(10.432, 77.535),
            population=38000, vulnerable_population=6840, elevation_m=300.0, drainage_capacity=0.4, current_water_level_m=0.7, rainfall_mm=70.0,
            hospitals=[Hospital(id="PH6", name="Balakrishnapuram PHC", lat=10.432, lng=77.535, capacity=50, operational=True, flood_risk=0.5)],
            shelters=[Shelter(id="PS6", name="Balakrishnapuram Center", lat=10.434, lng=77.538, capacity=600, current_occupancy=110, supplies_days=4)],
            roads=[Road(id="PR6", name="South Bypass Link", from_zone="P6", to_zone="P1", status="flooded", flood_depth_m=0.5, is_evacuation_route=True, road_type="Secondary Road", coordinates=[[10.428, 77.530], [10.432, 77.535], [10.442, 77.538]])],
            rescue_teams=[RescueTeam(id="PRT6", name="SDRF Unit Delta", lat=10.433, lng=77.536, personnel=20, boats=6, status="active", assigned_zone="P6")]
        ),
        Zone(
            id="P7", name="Shanmuganadhi Sector", polygon=_poly(10.468, 77.545),
            population=42000, vulnerable_population=7560, elevation_m=290.0, drainage_capacity=0.3, current_water_level_m=0.9, rainfall_mm=85.0,
            hospitals=[Hospital(id="PH7", name="River Basin Clinic", lat=10.468, lng=77.545, capacity=40, operational=True, flood_risk=0.7)],
            shelters=[Shelter(id="PS7", name="Shanmuganadhi Flood Relief Camp", lat=10.470, lng=77.548, capacity=1200, current_occupancy=300, supplies_days=6)],
            roads=[Road(id="PR7", name="River Bank Dam Road", from_zone="P7", to_zone="P2", status="blocked", flood_depth_m=0.9, is_evacuation_route=True, road_type="Main Road", coordinates=[[10.462, 77.540], [10.468, 77.545], [10.475, 77.550]])],
            rescue_teams=[RescueTeam(id="PRT7", name="NDRF Boat Team Echo", lat=10.469, lng=77.546, personnel=30, boats=10, status="active", assigned_zone="P7")]
        ),
        Zone(
            id="P8", name="Oddanchatram Road", polygon=_poly(10.460, 77.575),
            population=48000, vulnerable_population=8640, elevation_m=310.0, drainage_capacity=0.55, current_water_level_m=0.3, rainfall_mm=40.0,
            hospitals=[Hospital(id="PH8", name="Highway Care Center", lat=10.460, lng=77.575, capacity=90, operational=True, flood_risk=0.2)],
            shelters=[Shelter(id="PS8", name="Oddanchatram Highway Shelter", lat=10.462, lng=77.578, capacity=1100, current_occupancy=50, supplies_days=8)],
            roads=[Road(id="PR8", name="Dindigul Eastern Corridor", from_zone="P8", to_zone="P5", status="open", flood_depth_m=0.1, is_evacuation_route=True, road_type="Highway", coordinates=[[10.455, 77.568], [10.460, 77.575], [10.468, 77.588]])],
            rescue_teams=[RescueTeam(id="PRT8", name="Highway Emergency Response", lat=10.461, lng=77.576, personnel=15, boats=2, status="standby", assigned_zone="P8")]
        ),
        Zone(
            id="P9", name="Sivagiri", polygon=_poly(10.420, 77.550),
            population=35000, vulnerable_population=6300, elevation_m=315.0, drainage_capacity=0.6, current_water_level_m=0.2, rainfall_mm=25.0,
            hospitals=[Hospital(id="PH9", name="Sivagiri PHC", lat=10.420, lng=77.550, capacity=45, operational=True, flood_risk=0.1)],
            shelters=[Shelter(id="PS9", name="Sivagiri Community Hall", lat=10.422, lng=77.552, capacity=700, current_occupancy=20, supplies_days=5)],
            roads=[Road(id="PR9", name="Southern Agri Loop", from_zone="P9", to_zone="P6", status="open", flood_depth_m=0.0, is_evacuation_route=True, road_type="Secondary Road", coordinates=[[10.415, 77.545], [10.420, 77.550], [10.428, 77.555]])],
            rescue_teams=[RescueTeam(id="PRT9", name="Rural SDRF Unit", lat=10.421, lng=77.551, personnel=16, boats=2, status="standby", assigned_zone="P9")]
        ),
        Zone(
            id="P10", name="Kothaimangalam", polygon=_poly(10.475, 77.505),
            population=30000, vulnerable_population=5400, elevation_m=325.0, drainage_capacity=0.6, current_water_level_m=0.2, rainfall_mm=35.0,
            hospitals=[Hospital(id="PH10", name="North Palani PHC", lat=10.475, lng=77.505, capacity=50, operational=True, flood_risk=0.2)],
            shelters=[Shelter(id="PS10", name="Kothaimangalam School Hub", lat=10.478, lng=77.508, capacity=650, current_occupancy=15, supplies_days=6)],
            roads=[Road(id="PR10", name="North Dharapuram Link", from_zone="P10", to_zone="P2", status="open", flood_depth_m=0.1, is_evacuation_route=True, road_type="Main Road", coordinates=[[10.470, 77.500], [10.475, 77.505], [10.482, 77.515]])],
            rescue_teams=[RescueTeam(id="PRT10", name="North Palani Patrol", lat=10.476, lng=77.506, personnel=14, boats=2, status="standby", assigned_zone="P10")]
        )
    ]

def _get_coimbatore_state() -> List[Zone]:
    zones_data = [
        ("C1", "Gandhipuram", 145000, 11.018, 76.958, 0.3, 35.0, "LOW"),
        ("C2", "RS Puram", 120000, 11.006, 76.950, 0.2, 25.0, "LOW"),
        ("C3", "Peelamedu", 160000, 11.028, 76.995, 0.4, 45.0, "MEDIUM"),
        ("C4", "Singanallur", 155000, 10.998, 77.025, 0.7, 85.0, "CRITICAL"),
        ("C5", "Ukkadam", 130000, 10.992, 76.960, 0.8, 90.0, "CRITICAL"),
        ("C6", "Saravanampatti", 140000, 11.080, 76.995, 0.2, 20.0, "LOW"),
        ("C7", "Vadavalli", 115000, 11.025, 76.905, 0.1, 15.0, "LOW"),
        ("C8", "Kurichi", 125000, 10.955, 76.965, 0.6, 65.0, "HIGH"),
        ("C9", "Podanur", 110000, 10.965, 76.985, 0.5, 55.0, "MEDIUM"),
        ("C10", "Thudiyalur", 135000, 11.082, 76.938, 0.2, 30.0, "LOW"),
    ]

    return [
        Zone(
            id=zid, name=name, polygon=_poly(lat, lng, seed=i+1),
            population=pop, vulnerable_population=int(pop * 0.18), elevation_m=410.0, drainage_capacity=0.6, current_water_level_m=water, rainfall_mm=rain,
            risk_score=0.85 if lvl == "CRITICAL" else (0.65 if lvl == "HIGH" else (0.45 if lvl == "MEDIUM" else 0.2)), risk_level=lvl,
            hospitals=[Hospital(id=f"CH{i+1}", name=f"{name} City GH", lat=lat, lng=lng, capacity=300, operational=True, flood_risk=water/2.0)],
            shelters=[Shelter(id=f"CS{i+1}", name=f"{name} Relief Center", lat=lat+0.002, lng=lng+0.002, capacity=1200, current_occupancy=80, supplies_days=7)],
            roads=[Road(id=f"CR{i+1}", name=f"{name} Main Corridor", from_zone=zid, to_zone="C1", status="flooded" if water > 0.5 else "open", flood_depth_m=water, is_evacuation_route=True, road_type="Highway", coordinates=[[lat-0.005, lng-0.005], [lat, lng], [lat+0.005, lng+0.005]])],
            rescue_teams=[RescueTeam(id=f"CRT{i+1}", name=f"{name} Rescue Unit", lat=lat, lng=lng, personnel=25, boats=5, status="active" if water > 0.5 else "standby", assigned_zone=zid)]
        )
        for i, (zid, name, pop, lat, lng, water, rain, lvl) in enumerate(zones_data)
    ]

def _get_madurai_state() -> List[Zone]:
    zones_data = [
        ("M1", "Meenakshi Temple Zone", 170000, 9.924, 78.120, 0.5, 48.0, "HIGH"),
        ("M2", "Anna Nagar", 135000, 9.920, 78.145, 0.2, 20.0, "LOW"),
        ("M3", "KK Nagar", 145000, 9.932, 78.148, 0.3, 30.0, "LOW"),
        ("M4", "Goripalayam", 150000, 9.935, 78.125, 0.7, 80.0, "CRITICAL"),
        ("M5", "Simmakkal", 125000, 9.928, 78.118, 0.6, 70.0, "HIGH"),
        ("M6", "Sellur", 140000, 9.945, 78.122, 0.8, 95.0, "CRITICAL"),
        ("M7", "Tiruparankundram", 160000, 9.882, 78.071, 0.1, 15.0, "LOW"),
        ("M8", "Mattuthavani", 130000, 9.952, 78.155, 0.4, 40.0, "MEDIUM"),
        ("M9", "Tallakulam", 115000, 9.938, 78.132, 0.3, 35.0, "LOW"),
        ("M10", "Arapayam", 120000, 9.930, 78.098, 0.5, 50.0, "MEDIUM"),
    ]

    return [
        Zone(
            id=zid, name=name, polygon=_poly(lat, lng, seed=i+1),
            population=pop, vulnerable_population=int(pop * 0.18), elevation_m=101.0, drainage_capacity=0.5, current_water_level_m=water, rainfall_mm=rain,
            risk_score=0.88 if lvl == "CRITICAL" else (0.68 if lvl == "HIGH" else (0.42 if lvl == "MEDIUM" else 0.22)), risk_level=lvl,
            hospitals=[Hospital(id=f"MH{i+1}", name=f"{name} Hospital", lat=lat, lng=lng, capacity=350, operational=True, flood_risk=water/2.0)],
            shelters=[Shelter(id=f"MS{i+1}", name=f"{name} Community Shelter", lat=lat+0.002, lng=lng+0.002, capacity=1500, current_occupancy=100, supplies_days=8)],
            roads=[Road(id=f"MR{i+1}", name=f"{name} Arterial Road", from_zone=zid, to_zone="M1", status="flooded" if water > 0.5 else "open", flood_depth_m=water, is_evacuation_route=True, road_type="Main Road", coordinates=[[lat-0.005, lng-0.005], [lat, lng], [lat+0.005, lng+0.005]])],
            rescue_teams=[RescueTeam(id=f"MRT{i+1}", name=f"{name} SDRF Squad", lat=lat, lng=lng, personnel=28, boats=6, status="active" if water > 0.5 else "standby", assigned_zone=zid)]
        )
        for i, (zid, name, pop, lat, lng, water, rain, lvl) in enumerate(zones_data)
    ]

def _get_cuddalore_state() -> List[Zone]:
    zones_data = [
        ("CD1", "Cuddalore OT Port", 125000, 11.745, 79.768, 0.9, 85.0, "CRITICAL"),
        ("CD2", "Manjakuppam", 110000, 11.755, 79.760, 0.4, 40.0, "MEDIUM"),
        ("CD3", "Thirupapuliyur", 130000, 11.740, 79.750, 0.6, 65.0, "HIGH"),
        ("CD4", "Devanampattinam", 95000, 11.748, 79.780, 1.2, 120.0, "CRITICAL"),
        ("CD5", "Semmandalam", 105000, 11.765, 79.745, 0.3, 30.0, "LOW"),
        ("CD6", "SIPCOT Industrial Zone", 140000, 11.700, 79.735, 0.8, 95.0, "CRITICAL"),
        ("CD7", "Nellikuppam", 115000, 11.770, 79.680, 0.2, 25.0, "LOW"),
        ("CD8", "Pachaiyankuppam", 88000, 11.720, 79.762, 0.7, 75.0, "HIGH"),
        ("CD9", "Chidambaram Road", 100000, 11.730, 79.755, 0.4, 45.0, "MEDIUM"),
        ("CD10", "Kondur", 92000, 11.760, 79.730, 0.2, 20.0, "LOW"),
    ]

    return [
        Zone(
            id=zid, name=name, polygon=_poly(lat, lng, seed=i+1),
            population=pop, vulnerable_population=int(pop * 0.22), elevation_m=3.0, drainage_capacity=0.3, current_water_level_m=water, rainfall_mm=rain,
            risk_score=0.92 if lvl == "CRITICAL" else (0.72 if lvl == "HIGH" else (0.45 if lvl == "MEDIUM" else 0.25)), risk_level=lvl,
            hospitals=[Hospital(id=f"CDH{i+1}", name=f"{name} Coastal GH", lat=lat, lng=lng, capacity=250, operational=True, flood_risk=water/2.0)],
            shelters=[Shelter(id=f"CDS{i+1}", name=f"{name} Cyclone Shelter", lat=lat+0.002, lng=lng+0.002, capacity=2500, current_occupancy=300, supplies_days=10)],
            roads=[Road(id=f"CDR{i+1}", name=f"{name} ECR Coastal Highway", from_zone=zid, to_zone="CD1", status="flooded" if water > 0.5 else "open", flood_depth_m=water, is_evacuation_route=True, road_type="Highway", coordinates=[[lat-0.005, lng-0.005], [lat, lng], [lat+0.005, lng+0.005]])],
            rescue_teams=[RescueTeam(id=f"CDRT{i+1}", name=f"{name} Marine Unit", lat=lat, lng=lng, personnel=35, boats=10, status="active" if water > 0.5 else "standby", assigned_zone=zid)]
        )
        for i, (zid, name, pop, lat, lng, water, rain, lvl) in enumerate(zones_data)
    ]

def _get_thoothukudi_state() -> List[Zone]:
    zones_data = [
        ("T1", "Pearl City Port", 160000, 8.761, 78.132, 1.0, 90.0, "CRITICAL"),
        ("T2", "Cruz Puram", 115000, 8.795, 78.150, 0.7, 75.0, "HIGH"),
        ("T3", "Muthiahpuram", 140000, 8.730, 78.125, 0.8, 85.0, "CRITICAL"),
        ("T4", "Thermal Power Zone", 125000, 8.745, 78.165, 0.9, 95.0, "CRITICAL"),
        ("T5", "Therespuram", 105000, 8.810, 78.155, 0.6, 65.0, "HIGH"),
        ("T6", "Spic Nagar", 130000, 8.720, 78.115, 0.3, 35.0, "LOW"),
        ("T7", "Bryant Nagar", 150000, 8.780, 78.130, 0.5, 50.0, "MEDIUM"),
        ("T8", "Tiruchendur Road", 135000, 8.755, 78.120, 0.4, 45.0, "MEDIUM"),
        ("T9", "Kovilpatti Bypass", 120000, 8.815, 78.110, 0.2, 20.0, "LOW"),
        ("T10", "Harbour Estate", 145000, 8.740, 78.150, 1.1, 110.0, "CRITICAL"),
    ]

    return [
        Zone(
            id=zid, name=name, polygon=_poly(lat, lng, seed=i+1),
            population=pop, vulnerable_population=int(pop * 0.20), elevation_m=2.0, drainage_capacity=0.25, current_water_level_m=water, rainfall_mm=rain,
            risk_score=0.94 if lvl == "CRITICAL" else (0.70 if lvl == "HIGH" else (0.42 if lvl == "MEDIUM" else 0.22)), risk_level=lvl,
            hospitals=[Hospital(id=f"TH{i+1}", name=f"{name} Govt Medical College", lat=lat, lng=lng, capacity=400, operational=True, flood_risk=water/2.0)],
            shelters=[Shelter(id=f"TS{i+1}", name=f"{name} Port Trust Cyclone Center", lat=lat+0.002, lng=lng+0.002, capacity=3000, current_occupancy=450, supplies_days=12)],
            roads=[Road(id=f"TR{i+1}", name=f"{name} Harbour Bypass Expressway", from_zone=zid, to_zone="T1", status="flooded" if water > 0.5 else "open", flood_depth_m=water, is_evacuation_route=True, road_type="Highway", coordinates=[[lat-0.005, lng-0.005], [lat, lng], [lat+0.005, lng+0.005]])],
            rescue_teams=[RescueTeam(id=f"TRT{i+1}", name=f"{name} Coast Guard Rescue", lat=lat, lng=lng, personnel=40, boats=12, status="active" if water > 0.5 else "standby", assigned_zone=zid)]
        )
        for i, (zid, name, pop, lat, lng, water, rain, lvl) in enumerate(zones_data)
    ]

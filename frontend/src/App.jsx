import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, BarChart3, Sliders, Bot, Radio, Activity, Users, ShieldAlert, Home, Navigation,
  Sparkles, CheckCircle2, ShieldCheck, Globe, MapPin
} from 'lucide-react';
import MapView from './components/MapView';
import RiskDashboard from './components/RiskDashboard';
import SimulatorPanel from './components/SimulatorPanel';
import AICommander from './components/AICommander';
import VoiceBriefing from './components/VoiceBriefing';
import Timeline from './components/Timeline';
import { fetchTwinState, runSimulation, fetchHealth } from './utils/api';

const REGIONS = [
  { id: 'chennai', label: 'Chennai', scenario: 'Urban Flood / Cyclone' },
  { id: 'palani', label: 'Palani', scenario: 'Heavy Rain / Landslide Risk' },
  { id: 'coimbatore', label: 'Coimbatore', scenario: 'Urban Flood / Heavy Rain' },
  { id: 'madurai', label: 'Madurai', scenario: 'Urban Flood / Extreme Rainfall' },
  { id: 'cuddalore', label: 'Cuddalore', scenario: 'Coastal Flood / Cyclone' },
  { id: 'thoothukudi', label: 'Thoothukudi', scenario: 'Coastal Flood / Cyclone Surge' },
];

export default function App() {
  const [area, setArea] = useState('chennai');
  const [twinState, setTwinState] = useState(() => getOfflineDemoState('chennai'));
  const [initialTwinState, setInitialTwinState] = useState(() => getOfflineDemoState('chennai'));
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'risk' | 'simulate' | 'commander'
  const [selectedZone, setSelectedZone] = useState(null);
  const [aiDecisionTrace, setAiDecisionTrace] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [timelineProgress, setTimelineProgress] = useState(20);
  const [simStepLabel, setSimStepLabel] = useState('NOW');
  const [isDemo, setIsDemo] = useState(true);
  const [language, setLanguage] = useState('en');
  const [time, setTime] = useState(new Date());

  // Fetch twin state when area changes
  useEffect(() => {
    async function loadAreaState() {
      try {
        setSelectedZone(null);
        setSimResult(null);
        setAiDecisionTrace(null);

        const [state, health] = await Promise.all([
          fetchTwinState(area),
          fetchHealth(),
        ]);
        setTwinState(state);
        setInitialTwinState(state);
        setIsDemo(health.demo_mode !== false);
      } catch (err) {
        console.warn(`Backend not available, using offline mode for ${area}`);
        const offlineState = getOfflineDemoState(area);
        setTwinState(offlineState);
        setInitialTwinState(offlineState);
        setIsDemo(true);
      }
    }
    loadAreaState();
  }, [area]);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => setInterval(interval);
  }, []);

  // AI Decision Connection
  const handleAiDecision = useCallback((trace) => {
    if (!trace) return;
    setAiDecisionTrace(trace);
    const zoneId = trace.zone_id || (twinState?.zones.find(z => z.name.toLowerCase() === (trace.priority_zone || '').toLowerCase())?.id);
    if (zoneId) {
      setSelectedZone(zoneId);
    }
  }, [twinState]);

  // Simulation handler
  const handleSimulate = useCallback(async (params) => {
    setSimulating(true);
    setSimResult(null);
    setTimelineProgress(0);

    const fullParams = { ...params, area };

    let finalResult = null;
    try {
      finalResult = await runSimulation(fullParams);
    } catch {
      finalResult = applyLocalSimulation(twinState || initialTwinState, fullParams);
    }

    const targetZones = finalResult.twin_state?.zones || [];
    const baseZones = initialTwinState?.zones || twinState?.zones || [];

    const stepSequence = [
      { label: 'NOW', progress: 0, pct: 0.0 },
      { label: '+1H', progress: 25, pct: 0.25 },
      { label: '+6H', progress: 50, pct: 0.50 },
      { label: '+12H', progress: 75, pct: 0.75 },
      { label: '+24H', progress: 100, pct: 1.00 },
    ];

    for (let i = 0; i < stepSequence.length; i++) {
      const step = stepSequence[i];
      setSimStepLabel(step.label);
      setTimelineProgress(step.progress);

      if (baseZones.length > 0 && targetZones.length > 0) {
        const intermediateZones = baseZones.map((baseZ, idx) => {
          const targetZ = targetZones[idx] || baseZ;
          const currentWater = baseZ.current_water_level_m + (targetZ.current_water_level_m - baseZ.current_water_level_m) * step.pct;
          const currentRiskScore = baseZ.risk_score + (targetZ.risk_score - baseZ.risk_score) * step.pct;

          let currentRiskLevel = 'LOW';
          if (currentRiskScore >= 0.7) currentRiskLevel = 'CRITICAL';
          else if (currentRiskScore >= 0.5) currentRiskLevel = 'HIGH';
          else if (currentRiskScore >= 0.3) currentRiskLevel = 'MEDIUM';

          return {
            ...targetZ,
            current_water_level_m: +currentWater.toFixed(2),
            risk_score: +currentRiskScore.toFixed(3),
            risk_level: currentRiskLevel,
            roads: step.pct >= 0.75 ? targetZ.roads : baseZ.roads,
          };
        });

        setTwinState({ zones: intermediateZones });
      }

      await new Promise(r => setTimeout(r, 260));
    }

    setTwinState(finalResult.twin_state || finalResult);
    setSimResult(finalResult);
    setSimulating(false);
  }, [twinState, initialTwinState, area]);

  const handleZoneClick = useCallback((zoneId) => {
    setSelectedZone(prev => prev === zoneId ? null : zoneId);
  }, []);

  const handleSelectRouteOnMap = useCallback((zoneId, road) => {
    setSelectedZone(zoneId);
    setActiveTab('map');
  }, []);

  const activeRegionObj = REGIONS.find(r => r.id === area) || REGIONS[0];

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="top-header flex-center">
        <div className="flex-center" style={{ gap: 12 }}>
          <div className="app-title flex-center" style={{ gap: 8 }}>
            <AlertTriangle size={24} style={{ color: 'var(--accent-cyan)' }} />
            <span>DISASTERTWIN AI</span>
          </div>
          <span className="live-badge flex-center">
            <span className="pulse-dot" /> LIVE SIMULATION
          </span>
          {isDemo && (
            <span className="live-badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent-yellow)', borderColor: 'var(--accent-yellow)' }}>
              OFFLINE / DEMO MODE
            </span>
          )}
        </div>

        {/* Region Selector */}
        <div className="region-selector flex-center" style={{ gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>REGION:</span>
          <select
            className="region-select"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          >
            {REGIONS.map(r => (
              <option key={r.id} value={r.id}>{r.label.toUpperCase()} — {r.scenario}</option>
            ))}
          </select>
        </div>

        <div className="flex-center" style={{ gap: 16 }}>
          <div className="language-selector flex-center" style={{ gap: 4 }}>
            <Globe size={14} style={{ color: 'var(--text-secondary)' }} />
            <button
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
            <button
              className={`lang-btn ${language === 'ta' ? 'active' : ''}`}
              onClick={() => setLanguage('ta')}
            >
              தமிழ்
            </button>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <nav className="tab-nav flex-center">
        <button
          className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <MapPin size={16} /> Digital Twin Map ({activeRegionObj.label})
        </button>
        <button
          className={`tab-btn ${activeTab === 'risk' ? 'active' : ''}`}
          onClick={() => setActiveTab('risk')}
        >
          <BarChart3 size={16} /> Risk Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'simulate' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulate')}
        >
          <Sliders size={16} /> What-If Simulator
        </button>
        <button
          className={`tab-btn ${activeTab === 'commander' ? 'active' : ''}`}
          onClick={() => setActiveTab('commander')}
        >
          <Bot size={16} /> AI Commander
        </button>
      </nav>

      {/* Main Workspace Body */}
      <div className="app-workspace">
        {activeTab === 'map' && (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <MapView
              twinState={twinState}
              selectedZone={selectedZone}
              onZoneClick={handleZoneClick}
              aiDecisionTrace={aiDecisionTrace}
              area={area}
              showDirections={true}
            />

            {/* Timeline Control at bottom of Map */}
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 1000 }}>
              <Timeline
                progress={timelineProgress}
                simulating={simulating}
                stepLabel={simStepLabel}
              />
            </div>
          </div>
        )}

        {activeTab === 'risk' && (
          <RiskDashboard
            twinState={twinState}
            selectedZone={selectedZone}
            onZoneClick={setSelectedZone}
            onSelectRouteOnMap={handleSelectRouteOnMap}
          />
        )}

        {activeTab === 'simulate' && (
          <div className="grid-2col" style={{ gridTemplateColumns: '380px 1fr' }}>
            <SimulatorPanel
              twinState={twinState}
              onSimulate={handleSimulate}
              simulating={simulating}
            />
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <MapView
                twinState={twinState}
                selectedZone={selectedZone}
                onZoneClick={handleZoneClick}
                aiDecisionTrace={aiDecisionTrace}
                area={area}
                showDirections={false}
              />
              <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 1000 }}>
                <Timeline
                  progress={timelineProgress}
                  simulating={simulating}
                  stepLabel={simStepLabel}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'commander' && (
          <div className="grid-2col" style={{ gridTemplateColumns: '440px 1fr' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
              <AICommander
                onAiDecision={handleAiDecision}
                onApproveDeployment={(trace) => {
                  handleAiDecision(trace);
                  console.log("DEPLOYMENT PLAN APPROVED:", trace);
                }}
                twinState={twinState}
                area={area}
                language={language}
              />
              <VoiceBriefing language={language} twinState={twinState} />
            </div>
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <MapView
                twinState={twinState}
                selectedZone={selectedZone}
                onZoneClick={handleZoneClick}
                aiDecisionTrace={aiDecisionTrace}
                area={area}
                showDirections={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Offline demo state
function getOfflineDemoState(area = 'chennai') {
  const poly = (lat, lng, size = 0.010, seed = 1) => {
    const points = [];
    const numVertices = 12;
    for (let i = 0; i < numVertices; i++) {
      const angle = (2 * Math.PI * i) / numVertices;
      const radiusModifier = 1.0 + 0.35 * Math.sin(3 * angle + seed) + 0.20 * Math.cos(5 * angle - seed);
      const rLat = size * radiusModifier * 0.85;
      const rLng = size * radiusModifier * 1.15;
      points.push([
        Number((lat + rLat * Math.sin(angle)).toFixed(6)),
        Number((lng + rLng * Math.cos(angle)).toFixed(6))
      ]);
    }
    return points;
  };

  const cityData = {
    palani: [
      ["P1", "Palani Town", 110000, 10.450, 77.520, 0.4, 45.0, "MEDIUM"],
      ["P2", "Adivaram", 85000, 10.462, 77.525, 0.6, 60.0, "HIGH"],
      ["P3", "Giri Veedhi", 60000, 10.465, 77.528, 0.3, 55.0, "MEDIUM"],
      ["P4", "Neikkarapatti", 45000, 10.440, 77.480, 0.2, 30.0, "LOW"],
      ["P5", "Ayakudi", 52000, 10.448, 77.565, 0.5, 50.0, "MEDIUM"],
      ["P6", "Balakrishnapuram", 38000, 10.432, 77.535, 0.7, 70.0, "HIGH"],
      ["P7", "Shanmuganadhi Sector", 42000, 10.468, 77.545, 0.9, 85.0, "CRITICAL"],
      ["P8", "Oddanchatram Road", 48000, 10.460, 77.575, 0.3, 40.0, "LOW"],
      ["P9", "Sivagiri", 35000, 10.420, 77.550, 0.2, 25.0, "LOW"],
      ["P10", "Kothaimangalam", 30000, 10.475, 77.505, 0.2, 35.0, "LOW"],
    ],
    coimbatore: [
      ["C1", "Gandhipuram", 145000, 11.018, 76.958, 0.3, 35.0, "LOW"],
      ["C2", "RS Puram", 120000, 11.006, 76.950, 0.2, 25.0, "LOW"],
      ["C3", "Peelamedu", 160000, 11.028, 76.995, 0.4, 45.0, "MEDIUM"],
      ["C4", "Singanallur", 155000, 10.998, 77.025, 0.7, 85.0, "CRITICAL"],
      ["C5", "Ukkadam", 130000, 10.992, 76.960, 0.8, 90.0, "CRITICAL"],
      ["C6", "Saravanampatti", 140000, 11.080, 76.995, 0.2, 20.0, "LOW"],
      ["C7", "Vadavalli", 115000, 11.025, 76.905, 0.1, 15.0, "LOW"],
      ["C8", "Kurichi", 125000, 10.955, 76.965, 0.6, 65.0, "HIGH"],
      ["C9", "Podanur", 110000, 10.965, 76.985, 0.5, 55.0, "MEDIUM"],
      ["C10", "Thudiyalur", 135000, 11.082, 76.938, 0.2, 30.0, "LOW"],
    ],
    madurai: [
      ["M1", "Meenakshi Temple Zone", 170000, 9.924, 78.120, 0.5, 48.0, "HIGH"],
      ["M2", "Anna Nagar", 135000, 9.920, 78.145, 0.2, 20.0, "LOW"],
      ["M3", "KK Nagar", 145000, 9.932, 78.148, 0.3, 30.0, "LOW"],
      ["M4", "Goripalayam", 150000, 9.935, 78.125, 0.7, 80.0, "CRITICAL"],
      ["M5", "Simmakkal", 125000, 9.928, 78.118, 0.6, 70.0, "HIGH"],
      ["M6", "Sellur", 140000, 9.945, 78.122, 0.8, 95.0, "CRITICAL"],
      ["M7", "Tiruparankundram", 160000, 9.882, 78.071, 0.1, 15.0, "LOW"],
      ["M8", "Mattuthavani", 130000, 9.952, 78.155, 0.4, 40.0, "MEDIUM"],
      ["M9", "Tallakulam", 115000, 9.938, 78.132, 0.3, 35.0, "LOW"],
      ["M10", "Arapayam", 120000, 9.930, 78.098, 0.5, 50.0, "MEDIUM"],
    ],
    cuddalore: [
      ["CD1", "Cuddalore OT Port", 125000, 11.745, 79.768, 0.9, 85.0, "CRITICAL"],
      ["CD2", "Manjakuppam", 110000, 11.755, 79.760, 0.4, 40.0, "MEDIUM"],
      ["CD3", "Thirupapuliyur", 130000, 11.740, 79.750, 0.6, 65.0, "HIGH"],
      ["CD4", "Devanampattinam", 95000, 11.748, 79.780, 1.2, 120.0, "CRITICAL"],
      ["CD5", "Semmandalam", 105000, 11.765, 79.745, 0.3, 30.0, "LOW"],
      ["CD6", "SIPCOT Industrial Zone", 140000, 11.700, 79.735, 0.8, 95.0, "CRITICAL"],
      ["CD7", "Nellikuppam", 115000, 11.770, 79.680, 0.2, 25.0, "LOW"],
      ["CD8", "Pachaiyankuppam", 88000, 11.720, 79.762, 0.7, 75.0, "HIGH"],
      ["CD9", "Chidambaram Road", 100000, 11.730, 79.755, 0.4, 45.0, "MEDIUM"],
      ["CD10", "Kondur", 92000, 11.760, 79.730, 0.2, 20.0, "LOW"],
    ],
    thoothukudi: [
      ["TK1", "Pearl City Port", 160000, 8.761, 78.132, 1.0, 90.0, "CRITICAL"],
      ["TK2", "Cruz Puram", 115000, 8.795, 78.150, 0.7, 75.0, "HIGH"],
      ["TK3", "Muthiahpuram", 140000, 8.730, 78.125, 0.8, 85.0, "CRITICAL"],
      ["TK4", "Thermal Power Zone", 125000, 8.745, 78.165, 0.9, 95.0, "CRITICAL"],
      ["TK5", "Therespuram", 105000, 8.810, 78.155, 0.6, 65.0, "HIGH"],
      ["TK6", "Spic Nagar", 130000, 8.720, 78.115, 0.3, 35.0, "LOW"],
      ["TK7", "Bryant Nagar", 150000, 8.780, 78.130, 0.5, 50.0, "MEDIUM"],
      ["TK8", "Tiruchendur Road", 135000, 8.755, 78.120, 0.4, 45.0, "MEDIUM"],
      ["TK9", "Kovilpatti Bypass", 120000, 8.815, 78.110, 0.2, 20.0, "LOW"],
      ["TK10", "Harbour Estate", 145000, 8.740, 78.150, 1.1, 110.0, "CRITICAL"],
    ],
    chennai: [
      ["Z1", "Adyar", 120000, 13.008, 80.260, 0.2, 10.0, "LOW"],
      ["Z2", "Velachery", 150000, 12.980, 80.220, 0.8, 120.0, "CRITICAL"],
      ["Z3", "T. Nagar", 200000, 13.038, 80.234, 0.1, 5.0, "LOW"],
      ["Z4", "Mylapore", 110000, 13.030, 80.270, 0.1, 10.0, "LOW"],
      ["Z5", "Guindy", 90000, 13.010, 80.210, 0.05, 5.0, "LOW"],
      ["Z6", "Madipakkam", 135000, 12.965, 80.198, 0.6, 25.0, "HIGH"],
      ["Z7", "Perumbakkam", 160000, 12.900, 80.192, 0.7, 30.0, "HIGH"],
      ["Z8", "Sholinganallur", 175000, 12.901, 80.228, 0.5, 40.0, "MEDIUM"],
      ["Z9", "Tambaram", 220000, 12.925, 80.117, 0.1, 15.0, "LOW"],
      ["Z10", "Porur", 140000, 13.038, 80.156, 0.3, 20.0, "LOW"],
    ],
  };

  const list = cityData[area.toLowerCase()] || cityData.chennai;

  return {
    zones: list.map(([zid, name, pop, lat, lng, water, rain, lvl], i) => ({
      id: zid,
      name,
      population: pop,
      vulnerable_population: Math.round(pop * 0.18),
      elevation_m: 4.5,
      drainage_capacity: 0.5,
      current_water_level_m: water,
      rainfall_mm: rain,
      polygon: poly(lat, lng, 0.010, i + 1),
      risk_score: lvl === 'CRITICAL' ? 0.88 : (lvl === 'HIGH' ? 0.68 : (lvl === 'MEDIUM' ? 0.42 : 0.2)),
      risk_level: lvl,
      hospitals: [{ id: `H${i+1}`, name: `${name} Hospital`, lat: lat + 0.003, lng: lng - 0.003, capacity: 250, operational: true, flood_risk: water / 2.0 }],
      shelters: [{ id: `S${i+1}`, name: `${name} Relief Shelter`, lat: lat + 0.003, lng: lng + 0.003, capacity: 1200, current_occupancy: 100, supplies_days: 7 }],
      roads: [
        { id: `R${i+1}_A`, name: `${name} Main Road`, from_zone: zid, to_zone: 'Z1', status: water > 0.5 ? 'flooded' : 'open', flood_depth_m: water, is_evacuation_route: true, road_type: 'Main Road', coordinates: [[lat - 0.005, lng - 0.005], [lat, lng], [lat + 0.005, lng + 0.005]] },
        { id: `R${i+1}_B`, name: `${name} Link Expressway`, from_zone: zid, to_zone: 'Z2', status: 'open', flood_depth_m: 0.1, is_evacuation_route: true, road_type: 'Highway', coordinates: [[lat - 0.003, lng - 0.006], [lat, lng], [lat + 0.004, lng + 0.004]] }
      ],
      rescue_teams: [{ id: `RT${i+1}`, name: `${name} Rescue Unit`, lat: lat - 0.003, lng: lng, personnel: 25, boats: 6, status: 'active', assigned_zone: zid }]
    }))
  };
}

function applyLocalSimulation(state, params) {
  return { twin_state: state };
}

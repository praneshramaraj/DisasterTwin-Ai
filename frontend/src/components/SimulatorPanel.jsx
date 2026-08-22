import { useState, useEffect } from 'react';
import { Wand2, Activity, Clock, CheckCircle2, RotateCcw, AlertTriangle, Brain, ArrowDown } from 'lucide-react';

export default function SimulatorPanel({ twinState, onSimulate, simResult, loading, onNavigateToCommander }) {
  const zones = twinState?.zones || [];
  const allRoads = zones.flatMap(z => z.roads || []);
  const allRescue = zones.flatMap(z => z.rescue_teams || []);

  const avgRainfall = zones.length > 0
    ? Math.round(zones.reduce((s, z) => s + (z.rainfall_mm || 0), 0) / zones.length)
    : 50;
  const avgWater = zones.length > 0
    ? +(zones.reduce((s, z) => s + (z.current_water_level_m || 0), 0) / zones.length).toFixed(1)
    : 0.5;

  const [rainfall, setRainfall] = useState(avgRainfall);
  const [waterLevel, setWaterLevel] = useState(avgWater);
  const [blockedRoads, setBlockedRoads] = useState([]);
  const [rescueCount, setRescueCount] = useState(allRescue.length);
  const [shelterMod, setShelterMod] = useState(1.0);
  const [hasSimulated, setHasSimulated] = useState(false);

  // Requirement 4: Animated numbers
  const [animRisk, setAnimRisk] = useState(0);
  const [animPop, setAnimPop] = useState(0);
  const [animEvac, setAnimEvac] = useState(0);
  const [animBoats, setAnimBoats] = useState(0);
  const [animStaff, setAnimStaff] = useState(0);
  const [animShelters, setAnimShelters] = useState(0);

  // Baseline Current Metrics
  const baseRisk = zones.length > 0 ? Math.round((zones.reduce((s, z) => s + (z.risk_score || 0), 0) / zones.length) * 100) : 25;
  const basePop = zones.filter(z => z.risk_level === 'HIGH' || z.risk_level === 'CRITICAL').reduce((s, z) => s + (z.population || 0), 0) || 150000;
  const baseEvac = +(basePop / 15000).toFixed(1);

  useEffect(() => {
    if (simResult) {
      setHasSimulated(true);
      const targetPop = simResult.total_affected_population || 0;
      const targetEvac = simResult.estimated_evacuation_time_hours || 0;
      const targetBoats = simResult.resource_requirements?.boats || 0;
      const targetStaff = simResult.resource_requirements?.personnel || 0;
      const targetShelters = simResult.resource_requirements?.shelters_needed || 0;

      const simZones = simResult.twin_state?.zones || zones;
      const targetRisk = Math.round((simZones.reduce((s, z) => s + (z.risk_score || 0), 0) / simZones.length) * 100);

      let step = 0;
      const totalSteps = 25;
      const interval = setInterval(() => {
        step++;
        const pct = step / totalSteps;
        setAnimRisk(Math.round(baseRisk + (targetRisk - baseRisk) * pct));
        setAnimPop(Math.round(basePop + (targetPop - basePop) * pct));
        setAnimEvac(+(baseEvac + (targetEvac - baseEvac) * pct).toFixed(1));
        setAnimBoats(Math.round(targetBoats * pct));
        setAnimStaff(Math.round(targetStaff * pct));
        setAnimShelters(Math.round(targetShelters * pct));

        if (step >= totalSteps) clearInterval(interval);
      }, 20);

      return () => clearInterval(interval);
    }
  }, [simResult]);

  const toggleRoad = (roadId) => {
    setBlockedRoads(prev =>
      prev.includes(roadId) ? prev.filter(r => r !== roadId) : [...prev, roadId]
    );
  };

  const handleSimulate = () => {
    onSimulate({
      rainfall_mm: rainfall,
      water_level_m: waterLevel,
      blocked_roads: blockedRoads,
      rescue_teams_available: rescueCount,
      shelter_capacity_modifier: shelterMod,
    });
  };

  const handleReset = () => {
    setRainfall(avgRainfall);
    setWaterLevel(avgWater);
    setBlockedRoads([]);
    setRescueCount(allRescue.length);
    setShelterMod(1.0);
    setHasSimulated(false);
  };

  return (
    <div className="simulator-panel-container">
      {/* Requirement 1: Simulation Status Banner */}
      <div className="sim-status-card">
        {loading ? (
          <div className="status-box initializing pulse-critical">
            <Activity size={16} className="spin-icon" />
            <div>
              <strong style={{ display: 'block', fontSize: 12 }}>SIMULATING FUTURE...</strong>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Calculating hydrodynamic & risk parameters</span>
            </div>
          </div>
        ) : hasSimulated ? (
          <div className="status-box completed">
            <CheckCircle2 size={16} style={{ color: 'var(--risk-low)' }} />
            <div>
              <strong style={{ display: 'block', fontSize: 12, color: 'var(--risk-low)' }}>✓ FUTURE SCENARIO GENERATED</strong>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Forward forecast steps NOW → +24H ready</span>
            </div>
          </div>
        ) : (
          <div className="status-box ready">
            <Clock size={16} style={{ color: 'var(--accent-cyan)' }} />
            <div>
              <strong style={{ display: 'block', fontSize: 12, color: 'var(--accent-cyan)' }}>READY FOR SIMULATION</strong>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Scenario parameters loaded — click below</span>
            </div>
          </div>
        )}
      </div>

      {/* Environmental Controls */}
      <div className="simulator-section">
        <div className="simulator-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Environmental Parameters</span>
          <span className="sim-data-badge">SIMULATION DATA</span>
        </div>

        <div className="sim-control">
          <div className="sim-control-header">
            <span className="sim-control-label">🌧 Rainfall Surge</span>
            <span className="sim-control-value">{rainfall} mm</span>
          </div>
          <input
            type="range"
            className="sim-slider"
            min={0}
            max={300}
            step={5}
            value={rainfall}
            onChange={(e) => setRainfall(Number(e.target.value))}
          />
        </div>

        <div className="sim-control">
          <div className="sim-control-header">
            <span className="sim-control-label">💧 Water Depth Rise</span>
            <span className="sim-control-value">{waterLevel} m</span>
          </div>
          <input
            type="range"
            className="sim-slider"
            min={0}
            max={5.0}
            step={0.1}
            value={waterLevel}
            onChange={(e) => setWaterLevel(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Resource Controls */}
      <div className="simulator-section">
        <div className="simulator-section-title">Resource & Capacity Adjustments</div>

        <div className="sim-control">
          <div className="sim-control-header">
            <span className="sim-control-label">🚁 Available Rescue Teams</span>
            <span className="sim-control-value">{rescueCount}</span>
          </div>
          <input
            type="range"
            className="sim-slider"
            min={1}
            max={18}
            step={1}
            value={rescueCount}
            onChange={(e) => setRescueCount(Number(e.target.value))}
          />
        </div>

        <div className="sim-control">
          <div className="sim-control-header">
            <span className="sim-control-label">🏠 Shelter Capacity Factor</span>
            <span className="sim-control-value">×{shelterMod.toFixed(1)}</span>
          </div>
          <input
            type="range"
            className="sim-slider"
            min={0.5}
            max={2.0}
            step={0.1}
            value={shelterMod}
            onChange={(e) => setShelterMod(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Evacuation Route Blockers */}
      <div className="simulator-section">
        <div className="simulator-section-title">Evacuation Route Blockers</div>
        <div className="road-toggles">
          {allRoads.slice(0, 6).map((road, i) => {
            const isBlocked = blockedRoads.includes(road.id);
            const routeCode = i === 0 ? 'Route A' : i === 1 ? 'Route B' : i === 2 ? 'Route C' : `Route ${i+1}`;
            return (
              <div
                key={road.id}
                className={`road-toggle ${isBlocked ? 'blocked' : ''}`}
                onClick={() => toggleRoad(road.id)}
              >
                <span className="road-toggle-name">
                  ⚡ <strong>{routeCode}</strong> ({road.name})
                </span>
                <span className={`road-toggle-status ${isBlocked ? 'blocked' : 'open'}`}>
                  {isBlocked ? '✕ Blocked' : '✓ Open'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Requirement 1: Primary CTA Simulate Button */}
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`simulate-cta-btn ${loading ? 'loading' : (hasSimulated ? 'completed' : '')}`}
            onClick={handleSimulate}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? (
              <><div className="spinner" /> SIMULATION INITIALIZING...</>
            ) : hasSimulated ? (
              <><CheckCircle2 size={18} /> ✓ FUTURE SCENARIO GENERATED</>
            ) : (
              <><Wand2 size={18} /> 🔮 SIMULATE FUTURE</>
            )}
          </button>
          <button
            className="simulate-cta-btn reset"
            onClick={handleReset}
            style={{ flex: '0 0 auto', padding: '14px 16px', background: 'var(--bg-hover)' }}
            title="Reset parameters"
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
          Test this disaster scenario before taking real-world action.
        </div>
      </div>

      {/* Requirement 5: Before / After Comparison Card */}
      {hasSimulated && simResult && (
        <div className="before-after-comparison" style={{ marginTop: 14 }}>
          <div className="comparison-title">BEFORE vs AFTER SIMULATION</div>
          <div className="comparison-grid">
            <div className="comp-card">
              <div className="comp-lbl">CURRENT STATE</div>
              <div className="comp-metric">Risk: <strong>{baseRisk}%</strong></div>
              <div className="comp-metric">Pop: <strong>{basePop.toLocaleString()}</strong></div>
              <div className="comp-metric">Evac: <strong>{baseEvac}h</strong></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ArrowDown className="comp-arrow" />
            </div>
            <div className="comp-card" style={{ borderColor: 'var(--accent-blue)', background: 'rgba(37, 99, 235, 0.1)' }}>
              <div className="comp-lbl" style={{ color: 'var(--accent-cyan)' }}>SIMULATED FUTURE</div>
              <div className="comp-metric">Risk: <strong style={{ color: 'var(--risk-critical)' }}>{animRisk}%</strong></div>
              <div className="comp-metric">Pop: <strong style={{ color: 'var(--risk-high)' }}>{animPop.toLocaleString()}</strong></div>
              <div className="comp-metric">Evac: <strong style={{ color: 'var(--accent-cyan)' }}>{animEvac}h</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Requirement 6: Simulation Events Stream Feed */}
      {hasSimulated && (
        <div className="event-feed-card" style={{ marginTop: 12 }}>
          <div className="event-feed-header">
            <span>SIMULATION EVENTS</span>
            <span className="sim-data-badge">SIMULATION DATA</span>
          </div>
          <div className="event-feed-list">
            <div className="event-item info">
              <span className="event-time">✓ +1H</span>
              <span className="event-msg">Rainfall threshold exceeded ({rainfall}mm surge)</span>
            </div>
            <div className="event-item warning">
              <span className="event-time">⚠ +6H</span>
              <span className="event-msg">Flood risk increased (Water rise +{waterLevel}m)</span>
            </div>
            {blockedRoads.length > 0 && (
              <div className="event-item critical">
                <span className="event-time">⚠ +12H</span>
                <span className="event-msg">Road accessibility reduced ({blockedRoads.length} route blockers)</span>
              </div>
            )}
            <div className="event-item critical">
              <span className="event-time">🔴 +24H</span>
              <span className="event-msg">Critical zone detected — Priority evacuation directive</span>
            </div>
          </div>
        </div>
      )}

      {/* Requirement 4: Animated Forecast Metrics (T+24H) */}
      {simResult && (
        <div className="sim-results" style={{ marginTop: 12 }}>
          <div className="sim-results-title">
            <Activity size={14} /> FORECAST METRICS (+24H)
          </div>

          <div className="sim-result-row">
            <span className="sim-result-label">City Risk</span>
            <span className="sim-result-value anim-num" style={{ color: 'var(--risk-critical)' }}>
              {animRisk}%
            </span>
          </div>

          <div className="sim-result-row">
            <span className="sim-result-label">People at Risk</span>
            <span className="sim-result-value anim-num" style={{ color: 'var(--risk-high)' }}>
              {animPop.toLocaleString()}
            </span>
          </div>

          <div className="sim-result-row">
            <span className="sim-result-label">Evacuation Time</span>
            <span className="sim-result-value anim-num" style={{ color: 'var(--accent-cyan)' }}>
              {animEvac} hrs
            </span>
          </div>

          <div className="sim-result-row">
            <span className="sim-result-label">Boats Required</span>
            <span className="sim-result-value anim-num">
              {animBoats}
            </span>
          </div>

          <div className="sim-result-row">
            <span className="sim-result-label">Personnel Required</span>
            <span className="sim-result-value anim-num">
              {animStaff}
            </span>
          </div>

          <div className="sim-result-row">
            <span className="sim-result-label">Shelters Required</span>
            <span className="sim-result-value anim-num">
              {animShelters}
            </span>
          </div>

          {/* Requirement 7: Completion & Ask AI Commander Button */}
          {hasSimulated && onNavigateToCommander && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
                AI ANALYSIS AVAILABLE
              </div>
              <button
                className="simulate-cta-btn"
                onClick={onNavigateToCommander}
                style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))' }}
              >
                <Brain size={16} /> 🧠 ASK AI COMMANDER
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

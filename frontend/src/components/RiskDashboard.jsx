import { useState, useEffect, useMemo } from 'react';
import { Users, Building2, Home, Truck, ShieldAlert, ArrowDown, ArrowUp, Activity, Clock, ShieldCheck, Sparkles, Search, Navigation, Route as RouteIcon, MapPin, ExternalLink } from 'lucide-react';

const RISK_CLASS = {
  LOW: 'risk-low',
  MEDIUM: 'risk-medium',
  HIGH: 'risk-high',
  CRITICAL: 'risk-critical',
};

const RISK_BG = {
  LOW: 'var(--risk-low)',
  MEDIUM: 'var(--risk-medium)',
  HIGH: 'var(--risk-high)',
  CRITICAL: 'var(--risk-critical)',
};

export default function RiskDashboard({ twinState, selectedZone, onZoneClick, simResult, onSelectRouteOnMap }) {
  const zones = twinState?.zones || [];

  const [searchTerm, setSearchTerm] = useState('');

  // Filtered zones based on search term
  const filteredZones = useMemo(() => {
    if (!searchTerm.trim()) return zones;
    const term = searchTerm.toLowerCase().trim();
    return zones.filter(z =>
      z.name.toLowerCase().includes(term) ||
      z.id.toLowerCase().includes(term) ||
      (z.risk_level || '').toLowerCase().includes(term)
    );
  }, [zones, searchTerm]);

  // Metrics
  const avgRisk = zones.length > 0
    ? zones.reduce((s, z) => s + (z.risk_score || 0), 0) / zones.length
    : 0;

  const cityRiskPct = Math.round(avgRisk * 100);
  const overallLevel = cityRiskPct >= 70 ? 'CRITICAL' : (cityRiskPct >= 50 ? 'HIGH' : (cityRiskPct >= 30 ? 'MEDIUM' : 'LOW'));

  const criticalCount = zones.filter(z => z.risk_level === 'CRITICAL').length;
  const highRiskCount = zones.filter(z => z.risk_level === 'HIGH' || z.risk_level === 'CRITICAL').length;
  const totalPopAtRisk = zones.filter(z => z.risk_level === 'HIGH' || z.risk_level === 'CRITICAL').reduce((s, z) => s + z.population, 0);

  const allHospitals = zones.flatMap(z => z.hospitals || []);
  const operationalHospitals = allHospitals.filter(h => h.operational);

  const allShelters = zones.flatMap(z => z.shelters || []);
  const totalShelterCap = allShelters.reduce((s, sh) => s + (sh.capacity || 0), 0);
  const totalOccupancy = allShelters.reduce((s, sh) => s + (sh.current_occupancy || 0), 0);
  const shelterUsagePct = totalShelterCap > 0 ? Math.round((totalOccupancy / totalShelterCap) * 100) : 0;

  const allRescue = zones.flatMap(z => z.rescue_teams || []);
  const deployedRescue = allRescue.filter(r => r.status === 'deployed');

  const evacTimeEst = (highRiskCount * 2.5 + totalPopAtRisk / 18000).toFixed(1);

  // Animated counters
  const [dispRisk, setDispRisk] = useState(cityRiskPct);
  const [dispPop, setDispPop] = useState(totalPopAtRisk);

  useEffect(() => {
    let startR = dispRisk;
    let endR = cityRiskPct;
    let startP = dispPop;
    let endP = totalPopAtRisk;
    let steps = 15;
    let curr = 0;

    const timer = setInterval(() => {
      curr++;
      const p = curr / steps;
      setDispRisk(Math.round(startR + (endR - startR) * p));
      setDispPop(Math.round(startP + (endP - startP) * p));

      if (curr >= steps) clearInterval(timer);
    }, 25);

    return () => clearInterval(timer);
  }, [cityRiskPct, totalPopAtRisk]);

  return (
    <div className="risk-dashboard-wrapper">
      {/* Overall City Risk Metric Card */}
      <div className={`risk-overview ${overallLevel === 'CRITICAL' ? 'pulse-critical' : ''}`}>
        <div className="risk-overview-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span>Overall City Risk Index</span>
          <span className="sim-data-badge">SIMULATION DATA</span>
        </div>
        <div className={`risk-overview-score ${RISK_CLASS[overallLevel]}`}>
          {dispRisk}%
        </div>
        <div className={`risk-overview-level ${RISK_CLASS[overallLevel]}`}>
          {overallLevel} THREAT LEVEL
        </div>
      </div>

      {/* Before vs After Comparison Panel */}
      {simResult && (
        <div className="before-after-comparison">
          <div className="comparison-title">
            <Activity size={13} /> BEFORE VS AFTER SIMULATION
          </div>
          <div className="comparison-grid">
            <div className="comp-card before">
              <div className="comp-lbl">CURRENT</div>
              <div className="comp-metric">Risk: <strong>38%</strong></div>
              <div className="comp-metric">Pop: <strong>150,000</strong></div>
              <div className="comp-metric">Evac: <strong>6.8h</strong></div>
            </div>
            <div className="comp-arrow flex-center">
              ➔
            </div>
            <div className="comp-card after">
              <div className="comp-lbl" style={{ color: 'var(--risk-critical)' }}>FUTURE FORECAST</div>
              <div className="comp-metric" style={{ color: 'var(--risk-critical)' }}>
                Risk: <strong>{cityRiskPct}%</strong>
              </div>
              <div className="comp-metric" style={{ color: 'var(--risk-high)' }}>
                Pop: <strong>{(simResult.total_affected_population || 0).toLocaleString()}</strong>
              </div>
              <div className="comp-metric" style={{ color: 'var(--accent-cyan)' }}>
                Evac: <strong>{simResult.estimated_evacuation_time_hours || 0}h</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Metric Cards Grid */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-value risk-high">
            {dispPop.toLocaleString()}
          </div>
          <div className="stat-card-label">People At Risk</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value risk-critical">
            {criticalCount}
          </div>
          <div className="stat-card-label">Critical Zones</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value accent-cyan">
            {evacTimeEst}h
          </div>
          <div className="stat-card-label">Evacuation Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value risk-low">
            {deployedRescue.length} / {allRescue.length}
          </div>
          <div className="stat-card-label">Rescue Teams</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value accent-cyan">
            {shelterUsagePct}%
          </div>
          <div className="stat-card-label">Shelter Capacity</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value risk-low">
            {operationalHospitals.length} / {allHospitals.length}
          </div>
          <div className="stat-card-label">Hospitals Up</div>
        </div>
      </div>

      {/* SEARCH BAR & MONITORED SECTORS HEADER */}
      <div className="sectors-section-header">
        <div className="search-bar-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="sector-search-input"
            placeholder="🔍 Search sector / zone (e.g., Velachery, Adyar, Z2, Critical)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>

        <div className="sectors-meta-info">
          <span>MONITORED SECTORS ({filteredZones.length} OF {zones.length})</span>
          <span className="meta-hint">Click sector or route to view direction on map</span>
        </div>
      </div>

      {/* Monitored Sector Cards Grid */}
      <div className="zone-cards">
        {filteredZones
          .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
          .map(zone => {
            const roadsList = zone.roads || [];
            const sheltersList = zone.shelters || [];

            return (
              <div
                key={zone.id}
                className={`zone-card-detailed ${selectedZone === zone.id ? 'selected' : ''}`}
                onClick={() => onZoneClick && onZoneClick(zone.id)}
              >
                <div className="zone-card-top-row">
                  <div className="flex-center" style={{ gap: 8 }}>
                    <div
                      className="zone-risk-indicator"
                      style={{ background: RISK_BG[zone.risk_level] || RISK_BG.LOW }}
                    />
                    <div>
                      <div className="zone-card-name">
                        {zone.name.toUpperCase()} <span className="zone-id-tag">ZONE {zone.id}</span>
                      </div>
                      <div className="zone-card-pop">
                        <Users size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        <strong>{(zone.population || 0).toLocaleString()}</strong> residents
                        {' · '}
                        vulnerable: <strong>{(zone.vulnerable_population || 0).toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className={`zone-card-score ${RISK_CLASS[zone.risk_level]}`}>
                      {Math.round((zone.risk_score || 0) * 100)}%
                    </div>
                    <div className={`zone-card-level ${RISK_CLASS[zone.risk_level]}`}>
                      {zone.risk_level}
                    </div>
                  </div>
                </div>

                <div className="zone-card-stats-grid">
                  <div className="zone-stat-box">
                    <span className="stat-lbl">WATER DEPTH</span>
                    <span className="stat-val" style={{ color: zone.current_water_level_m > 0.5 ? '#ef4444' : '#38bdf8' }}>
                      💧 {zone.current_water_level_m.toFixed(1)}m
                    </span>
                  </div>
                  <div className="zone-stat-box">
                    <span className="stat-lbl">RAINFALL SURGE</span>
                    <span className="stat-val" style={{ color: zone.rainfall_mm > 50 ? '#f59e0b' : '#38bdf8' }}>
                      🌧 {zone.rainfall_mm}mm
                    </span>
                  </div>
                  <div className="zone-stat-box">
                    <span className="stat-lbl">NEARBY SHELTER</span>
                    <span className="stat-val">
                      🏠 {sheltersList[0]?.name || 'District Shelter'}
                    </span>
                  </div>
                </div>

                {/* AVAILABLE EVACUATION ROUTES LIST */}
                <div className="zone-routes-section">
                  <div className="routes-header">
                    <RouteIcon size={12} style={{ color: 'var(--accent-cyan)' }} />
                    <span>AVAILABLE EVACUATION ROUTES ({roadsList.length})</span>
                  </div>

                  <div className="routes-list">
                    {roadsList.map((road, idx) => {
                      const routeName = idx === 0 ? 'Route A' : (idx === 1 ? 'Route B' : `Route ${idx + 1}`);
                      const isFlooded = road.status === 'flooded';
                      const isBlocked = road.status === 'blocked';

                      return (
                        <div key={road.id} className="route-item-row">
                          <div className="route-item-left">
                            <span className={`route-badge ${idx === 0 ? 'badge-a' : 'badge-b'}`}>{routeName}</span>
                            <span className="route-road-name">{road.name}</span>
                          </div>

                          <div className="route-item-right flex-center" style={{ gap: 6 }}>
                            <span className={`route-status-tag ${road.status}`}>
                              {isBlocked ? '🚧 BLOCKED' : (isFlooded ? '⚠️ FLOODED' : '✓ OPEN')}
                            </span>
                            <button
                              className="view-route-direction-btn flex-center"
                              title="Show direction on Digital Twin Map"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectRouteOnMap) {
                                  onSelectRouteOnMap(zone.id, road);
                                }
                              }}
                            >
                              <Navigation size={10} /> View Direction
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

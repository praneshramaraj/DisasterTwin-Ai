import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Polyline, CircleMarker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Activity, Users, AlertTriangle, Layers, ShieldCheck, Navigation, ShieldAlert, Sparkles, Route as RouteIcon, AlertOctagon, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { fetchRoute } from '../utils/api';

// Fix Leaflet default icon paths for Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

try {
  if (L && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: markerIcon,
      iconRetinaUrl: markerIcon2x,
      shadowUrl: markerShadow,
    });
  }
} catch (e) {
  console.warn('Leaflet default icon patch skipped:', e);
}

const CHENNAI_CENTER = [12.9800, 80.2000];
const PALANI_CENTER = [10.4500, 77.5200];

const RISK_COLORS = {
  LOW: { fill: '#3b82f6', stroke: '#3b82f6', opacity: 0.22 },
  MEDIUM: { fill: '#f97316', stroke: '#f97316', opacity: 0.28 },
  HIGH: { fill: '#ea580c', stroke: '#ea580c', opacity: 0.35 },
  CRITICAL: { fill: '#ef4444', stroke: '#ef4444', opacity: 0.42 },
};

const ROAD_TYPE_WEIGHTS = {
  Highway: 5,
  'Main Road': 3.5,
  'Secondary Road': 2.2,
  'Local Road': 1.5,
};

const ROAD_STATUS_COLORS = {
  open: '#10b981',
  congested: '#f59e0b',
  flooded: '#f97316',
  blocked: '#ef4444',
};

// Tactical Command Center Markers with Glassmorphism & Micro-Glow
function createTacticalIcon(shortCode, badgeColor, glowColor, symbol) {
  return L.divIcon({
    className: 'tactical-marker',
    html: `
      <div class="tactical-badge" style="background:rgba(9,13,22,0.95); border:1.5px solid ${glowColor}; box-shadow:0 0 12px ${glowColor}; backdrop-filter:blur(6px);">
        <span class="badge-symbol" style="font-size:13px; line-height:1;">${symbol}</span>
        <span class="badge-label" style="font-family:'JetBrains Mono',monospace; font-weight:800; font-size:11px; color:#ffffff; letter-spacing:0.4px;">${shortCode}</span>
      </div>
    `,
    iconSize: [110, 26],
    iconAnchor: [55, 13],
  });
}

// 📍 YOU (CURRENT LOCATION) Marker with glowing ring node
const currentLocationMarkerIcon = L.divIcon({
  className: 'current-location-marker',
  html: `
    <div style="position:relative; display:flex; align-items:center; gap:6px; transform:translate(-50%, -50%); white-space:nowrap;">
      <div style="position:relative; width:28px; height:28px; flex-shrink:0;">
        <div style="position:absolute; width:28px; height:28px; border-radius:50%; background:rgba(168,85,247,0.4); animation:pulse-ring 1.8s infinite;"></div>
        <div style="position:absolute; top:2px; left:2px; width:24px; height:24px; border-radius:50%; background:#090d16; border:4px solid #c084fc; box-shadow:0 0 16px #a855f7;"></div>
      </div>
      <div style="background:#090d16; border:2px solid #c084fc; border-radius:8px; padding:2px 8px; box-shadow:0 0 14px rgba(168,85,247,0.6); color:#f3e8ff; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:800;">
        📍 YOU (CURRENT LOCATION)
      </div>
    </div>
  `,
  iconSize: [190, 28],
  iconAnchor: [14, 14],
});

// 🟢 Green Ring Node Marker for DESTINATION ENTRY (matching user screenshot)
const shelterPinMarkerIcon = L.divIcon({
  className: 'destination-ring-marker',
  html: `
    <div style="position:relative; width:30px; height:30px; transform:translate(-50%, -50%);">
      <div style="position:absolute; width:30px; height:30px; border-radius:50%; background:rgba(34,197,94,0.3); animation:pulse-ring 1.8s infinite;"></div>
      <div style="position:absolute; top:3px; left:3px; width:24px; height:24px; border-radius:50%; background:#090d16; border:4px solid #4ade80; box-shadow:0 0 14px #22c55e;"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

// 🚧 Blocked Road Marker
function createBlockedRoadMarker(label = 'R1 BLOCKED FLOODED') {
  return L.divIcon({
    className: 'blocked-road-marker-wrapper',
    html: `
      <div style="background:#180e0e; border:1px solid #ef4444; border-radius:6px; padding:3px 8px; box-shadow:0 0 12px rgba(239,68,68,0.5); display:flex; align-items:center; gap:5px; font-family:'JetBrains Mono',monospace; font-size:10px; color:#fca5a5; transform:translate(-50%, -50%); white-space:nowrap;">
        <span style="font-size:12px;">🚧</span>
        <span style="font-weight:800; color:#ef4444;">${label}</span>
      </div>
    `,
    iconSize: [160, 26],
    iconAnchor: [80, 13],
  });
}

// Speech Bubble Badges
function createRouteABadgeIcon(durationMin, distanceKm, isBest, isFlooded) {
  const bg = isFlooded ? '#dc2626' : (isBest ? '#1a73e8' : '#1e293b');
  const tagText = isFlooded ? '⚠️ FLOODED' : (isBest ? '★ BEST ROUTE' : 'FASTEST');
  const borderCol = isFlooded ? '#ef4444' : '#3b82f6';

  return L.divIcon({
    className: 'gmaps-badge-wrapper',
    html: `
      <div class="gmaps-eta-badge-blue" style="background:${bg}; border:1px solid ${borderCol}; transform:translate(-50%, -100%); margin-top:-10px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:13px;">🛵</span>
          <span style="font-size:13px; font-weight:800; color:#ffffff;">ROUTE A (${durationMin}m)</span>
        </div>
        <div style="font-size:10px; font-weight:700; opacity:0.95; margin-top:2px; color:#e0f2fe;">
          ${distanceKm} km • ${tagText}
        </div>
      </div>
    `,
    iconSize: [130, 50],
    iconAnchor: [65, 50],
  });
}

function createRouteBBadgeIcon(durationMin, distanceKm, isBest) {
  const bg = isBest ? '#10b981' : '#ffffff';
  const textCol = isBest ? '#ffffff' : '#1e293b';
  const tagText = isBest ? '★ RECOMMENDED SAFE' : 'BYPASS CORRIDOR';

  return L.divIcon({
    className: 'gmaps-badge-wrapper',
    html: `
      <div class="gmaps-eta-badge-white" style="background:${bg}; color:${textCol}; border:1px solid ${isBest ? '#059669' : '#cbd5e1'}; transform:translate(-50%, -100%); margin-top:-10px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:13px;">🚗</span>
          <span style="font-size:13px; font-weight:800;">ROUTE B (${durationMin}m)</span>
        </div>
        <div style="font-size:10px; font-weight:700; color:${isBest ? '#e0f2fe' : '#64748b'}; margin-top:2px;">
          ${distanceKm} km • ${tagText}
        </div>
      </div>
    `,
    iconSize: [140, 50],
    iconAnchor: [70, 50],
  });
}

const hospitalIcon = createTacticalIcon('H', '#0f172a', '#10b981', '🏥');
const shelterIcon = createTacticalIcon('S', '#0f172a', '#3b82f6', '🏠');
const rescueIcon = createTacticalIcon('R', '#0f172a', '#f59e0b', '🚁');

function MapUpdater({ area, defaultCenter, defaultZoom }) {
  const map = useMap();
  const prevAreaRef = useRef(area);

  useEffect(() => {
    if (prevAreaRef.current !== area) {
      prevAreaRef.current = area;
      map.setView(defaultCenter, defaultZoom, { animate: false });
    }
  }, [area, defaultCenter, defaultZoom, map]);

  return null;
}

function ZonePolygons({ zones, selectedZone, onZoneClick, showFloodRisk, aiDecisionTrace }) {
  const geoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: (zones || []).map(zone => ({
      type: 'Feature',
      properties: {
        id: zone.id,
        name: zone.name,
        risk_level: zone.risk_level,
        risk_score: zone.risk_score,
        population: zone.population,
        vulnerable_population: zone.vulnerable_population,
        water_level: zone.current_water_level_m,
        rainfall: zone.rainfall_mm,
        isSelected: zone.id === selectedZone,
        isAiPriority: aiDecisionTrace?.zone_id === zone.id || aiDecisionTrace?.priority_zone === zone.name,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [zone.polygon.map(([lat, lng]) => [lng, lat])],
      },
    })),
  }), [zones, selectedZone, aiDecisionTrace]);

  const style = (feature) => {
    const p = feature.properties;
    const level = p.risk_level || 'LOW';
    const c = RISK_COLORS[level] || RISK_COLORS.LOW;
    const isSel = p.isSelected || p.isAiPriority;

    return {
      fillColor: showFloodRisk ? c.fill : '#1e293b',
      fillOpacity: isSel ? 0.45 : (showFloodRisk ? c.opacity : 0.15),
      color: isSel ? '#ef4444' : c.stroke,
      weight: isSel ? 4.5 : (level === 'CRITICAL' ? 3.5 : 2.5),
      dashArray: undefined,
    };
  };

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    const level = p.risk_level || 'LOW';
    const riskColor = (RISK_COLORS[level] || RISK_COLORS.LOW).fill;

    layer.bindTooltip(
      `<div class="tactical-tooltip">
        <div class="tooltip-zone-name">${p.name.toUpperCase()} ${p.isAiPriority ? '★ AI PRIORITY' : ''}</div>
        <div class="tooltip-risk-badge" style="background:${riskColor}; color:#ffffff">${level}</div>
        <div className="tooltip-row" style="margin-top:4px"><strong>Risk Score:</strong> ${Math.round((p.risk_score || 0) * 100)}%</div>
        <div className="tooltip-row"><strong>Water Depth:</strong> ${(p.water_level || 0).toFixed(1)}m</div>
        <div className="tooltip-row"><strong>Population:</strong> ${(p.population || 0).toLocaleString()}</div>
      </div>`,
      { sticky: true, className: 'leaflet-tactical-tooltip' }
    );

    layer.on({ click: () => onZoneClick && onZoneClick(p.id) });
  };

  if (!zones || zones.length === 0) return null;

  return (
    <GeoJSON
      key={`zones-${selectedZone}-${JSON.stringify(aiDecisionTrace)}`}
      data={geoJson}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

export default function MapView({ twinState, selectedZone, onZoneClick, aiDecisionTrace, area = 'chennai', showDirections = true }) {
  const zones = twinState?.zones || [];
  const allHospitals = zones.flatMap(z => z.hospitals || []);
  const allShelters = zones.flatMap(z => z.shelters || []);
  const allRescue = zones.flatMap(z => z.rescue_teams || []);
  const allRoads = zones.flatMap(z => z.roads || []);

  const isPalani = area === 'palani';

  const [layers, setLayers] = useState({
    floodRisk: true,
    population: true,
    hospitals: true,
    shelters: true,
    rescue: true,
    roads: true,
    roadNetwork: true,
  });

  const [activeRouteData, setActiveRouteData] = useState(null);
  const [selectedRouteChoice, setSelectedRouteChoice] = useState('auto');
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [rerouteState, setRerouteState] = useState(null); // null | 'detecting' | 'calculating' | 'done'

  const topRiskZoneId = useMemo(() => {
    if (!zones || zones.length === 0) return null;
    const sorted = [...zones].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
    return sorted[0]?.id;
  }, [zones]);

  const activeZoneId = selectedZone || aiDecisionTrace?.zone_id || topRiskZoneId;
  const selectedZoneObj = useMemo(() => zones.find(z => z.id === activeZoneId || z.name.toLowerCase() === (aiDecisionTrace?.priority_zone || '').toLowerCase()), [zones, activeZoneId, aiDecisionTrace, topRiskZoneId]);

  const REGION_CENTERS = {
    chennai: { center: [12.9800, 80.2000], zoom: 11 },
    palani: { center: [10.4500, 77.5200], zoom: 13 },
    coimbatore: { center: [11.0168, 76.9558], zoom: 12 },
    madurai: { center: [9.9252, 78.1198], zoom: 12 },
    cuddalore: { center: [11.7480, 79.7714], zoom: 12 },
    thoothukudi: { center: [8.7642, 78.1348], zoom: 12 },
  };

  const regionConfig = REGION_CENTERS[(area || 'chennai').toLowerCase()] || REGION_CENTERS.chennai;
  const defaultCenter = regionConfig.center;
  const defaultZoom = regionConfig.zoom;

  const mapCenter = useMemo(() => {
    if (selectedZoneObj && selectedZoneObj.polygon?.length > 0) {
      const lats = selectedZoneObj.polygon.map(p => p[0]);
      const lngs = selectedZoneObj.polygon.map(p => p[1]);
      return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
    }
    return defaultCenter;
  }, [selectedZoneObj, defaultCenter]);

  // Instant road route calculation connecting YOU -> Rescue Team -> Hospital -> Shelter (0ms Latency)
  useEffect(() => {
    let isMounted = true;
    const startLat = mapCenter ? mapCenter[0] : (isPalani ? 10.4500 : 12.9800);
    const startLon = mapCenter ? mapCenter[1] : (isPalani ? 77.5200 : 80.2000);

    // Find nearest Shelter, Hospital, and Rescue Team
    const targetShelter = allShelters.length > 0 ? allShelters.reduce((min, s) => {
      const dist = Math.hypot(s.lat - startLat, s.lng - startLon);
      return dist < min.dist ? { shelter: s, dist } : min;
    }, { shelter: allShelters[0], dist: Infinity }).shelter : { name: "Relief Shelter Hub", lat: startLat + 0.008, lng: startLon + 0.008 };

    const targetHospital = allHospitals.length > 0 ? allHospitals.reduce((min, h) => {
      const dist = Math.hypot(h.lat - startLat, h.lng - startLon);
      return dist < min.dist ? { hospital: h, dist } : min;
    }, { hospital: allHospitals[0], dist: Infinity }).hospital : { name: "Emergency Hospital", lat: startLat + 0.004, lng: startLon + 0.004 };

    const targetRescue = allRescue.length > 0 ? allRescue.reduce((min, r) => {
      const dist = Math.hypot(r.lat - startLat, r.lng - startLon);
      return dist < min.dist ? { rescue: r, dist } : min;
    }, { rescue: allRescue[0], dist: Infinity }).rescue : { name: "NDRF Rescue Unit", lat: startLat + 0.002, lng: startLon + 0.002 };

    // Synchronous 0ms instant route state update for zero lag
    const instantPtsA = [
      [startLat, startLon],
      [(startLat + targetRescue.lat)/2 + 0.001, (startLon + targetRescue.lng)/2 + 0.001],
      [targetRescue.lat, targetRescue.lng],
      [(targetRescue.lat + targetHospital.lat)/2 + 0.001, (targetRescue.lng + targetHospital.lng)/2 + 0.001],
      [targetHospital.lat, targetHospital.lng],
      [(targetHospital.lat + targetShelter.lat)/2 + 0.001, (targetHospital.lng + targetShelter.lng)/2 + 0.001],
      [targetShelter.lat, targetShelter.lng]
    ];
    const instantPtsB = instantPtsA.map(([l, g]) => [l + 0.003, g - 0.003]);

    setActiveRouteData({
      status: "success",
      source: "Instant Local Engine",
      coordinates: instantPtsA,
      distance_km: 3.5,
      duration_min: 8.0,
      route_a: { name: "Route A (Multi-Stop Direct)", coordinates: instantPtsA, distance_km: 3.5, duration_min: 8.0, status: "CLEAR" },
      route_b: { name: "Route B (High-Ground Bypass)", coordinates: instantPtsB, distance_km: 6.2, duration_min: 14.0, status: "SAFE_OPEN" },
      best_recommended_route: "Route A",
      recommendation_reason: "Direct multi-stop route connecting Rescue Team, Hospital, and Shelter",
      shelterName: targetShelter.name,
      hospitalName: targetHospital.name,
      rescueName: targetRescue.name,
      startPos: [startLat, startLon],
      rescuePos: [targetRescue.lat, targetRescue.lng],
      hospPos: [targetHospital.lat, targetHospital.lng],
      endPos: [targetShelter.lat, targetShelter.lng]
    });

    async function loadOsmRoute() {
      const blockedNames = allRoads.filter(r => r.status === 'blocked').map(r => r.id).join(',');
      const rainfallVal = selectedZoneObj ? (selectedZoneObj.rainfall_mm || 0) : 0;
      const waterVal = selectedZoneObj ? (selectedZoneObj.current_water_level_m || 0) : 0;

      const routeRes = await fetchRoute({
        start_lat: startLat,
        start_lon: startLon,
        rescue_lat: targetRescue.lat,
        rescue_lon: targetRescue.lng,
        hosp_lat: targetHospital.lat,
        hosp_lon: targetHospital.lng,
        end_lat: targetShelter.lat,
        end_lon: targetShelter.lng,
        area,
        blocked_roads: blockedNames,
        rainfall_mm: rainfallVal,
        water_level_m: waterVal
      });

      if (isMounted && routeRes) {
        setActiveRouteData({
          ...routeRes,
          shelterName: targetShelter.name,
          hospitalName: targetHospital.name,
          rescueName: targetRescue.name,
          startPos: [startLat, startLon],
          rescuePos: [targetRescue.lat, targetRescue.lng],
          hospPos: [targetHospital.lat, targetHospital.lng],
          endPos: [targetShelter.lat, targetShelter.lng]
        });
      }
    }

    loadOsmRoute();
    return () => { isMounted = false; };
  }, [selectedZoneObj?.id, area]);

  const bestRecommended = activeRouteData?.best_recommended_route || "Route A";
  const activeRouteFocus = selectedRouteChoice === 'auto' ? (bestRecommended === "Route B" ? "route_b" : "route_a") : selectedRouteChoice;

  const routeAMidpoint = useMemo(() => {
    const coords = activeRouteData?.route_a?.coordinates || activeRouteData?.coordinates;
    if (!coords || coords.length === 0) return null;
    return coords[Math.floor(coords.length / 2)];
  }, [activeRouteData]);

  const routeBMidpoint = useMemo(() => {
    const coords = activeRouteData?.route_b?.coordinates || activeRouteData?.alternative_route?.coordinates;
    if (!coords || coords.length === 0) return null;
    return coords[Math.floor(coords.length / 2)];
  }, [activeRouteData]);

  return (
    <div className="map-container">
      {/* Top Map Header Overlay */}
      <div className="map-header-overlay">
        <div className="map-header-title-group">
          <div className="map-header-title">DIGITAL TWIN ({area.toUpperCase()})</div>
          <div className="map-header-subtitle">📍 REAL ROAD NETWORK & DISASTER ROUTING ENGINE</div>
        </div>
        <div className="map-header-meta">
          <span>Scenario: <strong>DISASTER RESPONSE</strong></span>
          <span>Engine: <strong style={{ color: 'var(--accent-cyan)' }}>OSRM + REAL ROADS</strong></span>
        </div>
      </div>

      {/* REROUTING ANIMATION BANNER */}
      {rerouteState && (
        <div className="reroute-animation-banner pulse-critical">
          {rerouteState === 'detecting' && (
            <div className="reroute-step">
              <AlertTriangle size={16} className="risk-critical" />
              <span>🚨 ROUTE CHANGE DETECTED — R1 BLOCKED DUE TO FLOODING</span>
            </div>
          )}
          {rerouteState === 'calculating' && (
            <div className="reroute-step">
              <div className="spinner" />
              <span>CALCULATING SAFEST ALTERNATIVE ROAD NETWORK...</span>
            </div>
          )}
          {rerouteState === 'done' && (
            <div className="reroute-step" style={{ color: 'var(--accent-green)' }}>
              <CheckCircle2 size={16} />
              <span>✓ NEW SAFEST ROUTE FOUND — VIA ROUTE B (HIGH-GROUND BYPASS)</span>
            </div>
          )}
        </div>
      )}

      {/* AI EVACUATION ROUTE SPECIFICATION PANEL */}
      {showDirections && activeRouteData && (
        <div className="ai-route-spec-panel">
          <div className="spec-panel-header">
            <div className="flex-center" style={{ gap: 6 }}>
              <RouteIcon size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span className="spec-panel-title">🚨 AI EVACUATION ROUTE</span>
            </div>
            <span className={`status-pill ${bestRecommended === 'Route B' ? 'risk-critical' : 'risk-low'}`}>
              ⭐ {bestRecommended === 'Route B' ? 'BYPASS RECOMMENDED' : 'RECOMMENDED'}
            </span>
          </div>

          <div className="spec-dest-box">
            <span className="spec-dest-lbl">DESTINATION</span>
            <span className="spec-dest-val">📍 {activeRouteData.shelterName || 'Adyar School Shelter'}</span>
          </div>

          <div className="spec-metrics-row">
            <div className="spec-metric-col">
              <span className="m-val">{activeRouteData.route?.distance_km || activeRouteData.distance_km} km</span>
              <span className="m-lbl">DISTANCE</span>
            </div>
            <div className="spec-metric-col">
              <span className="m-val">{activeRouteData.route?.duration_min || activeRouteData.duration_min} min</span>
              <span className="m-lbl">EST. TIME</span>
            </div>
            <div className="spec-metric-col">
              <span className="m-val" style={{ color: bestRecommended === 'Route B' ? '#10b981' : '#3b82f6' }}>
                {bestRecommended === 'Route B' ? 'SAFE BYPASS' : 'LOW RISK'}
              </span>
              <span className="m-lbl">SAFETY</span>
            </div>
          </div>

          <div className="spec-roads-breakdown">
            <span className="breakdown-tag open">🟢 6 roads open</span>
            <span className="breakdown-tag congested">🟠 1 congested</span>
            <span className="breakdown-tag blocked">🔴 {bestRecommended === 'Route B' ? '1 blocked' : '0 blocked'}</span>
          </div>

          <button
            className="view-alternatives-btn flex-center"
            onClick={() => setShowAlternativesModal(true)}
          >
            <span>[ VIEW ALTERNATIVES ]</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ALTERNATIVE ROUTES MODAL / DRAWER */}
      {showAlternativesModal && (
        <div className="alternatives-modal-overlay flex-center">
          <div className="alternatives-modal-card">
            <div className="modal-header">
              <span className="modal-title">ROUTE OPTIONS & SAFETY RANKING</span>
              <button className="close-modal-btn" onClick={() => setShowAlternativesModal(false)}><X size={16} /></button>
            </div>

            <div className="modal-routes-list">
              {/* Route B */}
              <div
                className={`modal-route-item ${activeRouteFocus === 'route_b' ? 'selected' : ''}`}
                onClick={() => { setSelectedRouteChoice('route_b'); setShowAlternativesModal(false); }}
              >
                <div className="m-item-header">
                  <span className="m-item-name">⭐ Route B (High Ground Bypass)</span>
                  <span className="status-pill risk-low">⭐ RECOMMENDED</span>
                </div>
                <div className="m-item-details">
                  <span>{activeRouteData?.route_b?.distance_km || 7.2} km</span> • <span>{activeRouteData?.route_b?.duration_min || 16.5} min</span> • <span style={{ color: '#10b981', fontWeight: 800 }}>🟢 LOW RISK</span>
                </div>
              </div>

              {/* Route C Alternative */}
              <div
                className="modal-route-item"
                onClick={() => { setSelectedRouteChoice('route_b'); setShowAlternativesModal(false); }}
              >
                <div className="m-item-header">
                  <span className="m-item-name">Route C (Suburban Link)</span>
                  <span className="status-pill" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>ALTERNATIVE</span>
                </div>
                <div className="m-item-details">
                  <span>5.8 km</span> • <span>14.0 min</span> • <span style={{ color: '#f59e0b', fontWeight: 800 }}>🟡 MODERATE RISK</span>
                </div>
              </div>

              {/* Route A Direct */}
              <div
                className={`modal-route-item ${bestRecommended === 'Route B' ? 'disabled' : ''}`}
                onClick={() => { setSelectedRouteChoice('route_a'); setShowAlternativesModal(false); }}
              >
                <div className="m-item-header">
                  <span className="m-item-name">Route A (Velachery Direct)</span>
                  <span className={`status-pill ${bestRecommended === 'Route B' ? 'risk-critical' : 'risk-low'}`}>
                    {bestRecommended === 'Route B' ? '🔴 FLOODED / UNAVAILABLE' : 'FASTEST'}
                  </span>
                  <span>{activeRouteData?.route_a?.distance_km || 3.1} km</span> • <span>{activeRouteData?.route_a?.duration_min || 7.5} min</span> • <span style={{ color: bestRecommended === 'Route B' ? '#ef4444' : '#3b82f6', fontWeight: 800 }}>
                    {bestRecommended === 'Route B' ? '🔴 SEVERE WATER LOGGING' : '🔵 CLEAR'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layer Controls Box */}
      <div className="map-layer-controls">
        <div className="layer-controls-header">
          <Layers size={12} /> LAYERS
        </div>
        <label className="layer-checkbox-row">
          <input type="checkbox" checked={layers.floodRisk} onChange={(e) => setLayers(l => ({ ...l, floodRisk: e.target.checked }))} />
          <span>Flood Risk</span>
        </label>
        <label className="layer-checkbox-row">
          <input type="checkbox" checked={layers.roadNetwork} onChange={(e) => setLayers(l => ({ ...l, roadNetwork: e.target.checked }))} />
          <span>Road Network</span>
        </label>
        <label className="layer-checkbox-row">
          <input type="checkbox" checked={layers.hospitals} onChange={(e) => setLayers(l => ({ ...l, hospitals: e.target.checked }))} />
          <span>Hospitals</span>
        </label>
        <label className="layer-checkbox-row">
          <input type="checkbox" checked={layers.shelters} onChange={(e) => setLayers(l => ({ ...l, shelters: e.target.checked }))} />
          <span>Shelters</span>
        </label>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        minZoom={8}
        maxZoom={18}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        boxZoom={true}
        preferCanvas={true}
        style={{ height: '100%', width: '100%', background: '#040711' }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
          tileSize={256}
          keepBuffer={8}
          updateWhenIdle={false}
          updateWhenZooming={false}
        />

        <MapUpdater area={area} defaultCenter={defaultCenter} defaultZoom={defaultZoom} />

        {/* Flood Risk Polygons */}
        <ZonePolygons
          zones={zones}
          selectedZone={selectedZone}
          onZoneClick={onZoneClick}
          showFloodRisk={layers.floodRisk}
          aiDecisionTrace={aiDecisionTrace}
        />

        {/* ☢️ RADIATION / HIGH-RISK EPICENTER PULSE RINGS FOR ALL CITIES */}
        {zones.map((zone, i) => {
          const isHighRisk = zone.risk_level === 'CRITICAL' || zone.risk_level === 'HIGH';
          if (!isHighRisk || !zone.polygon || zone.polygon.length === 0) return null;
          const centerLat = zone.polygon.reduce((sum, p) => sum + p[0], 0) / zone.polygon.length;
          const centerLng = zone.polygon.reduce((sum, p) => sum + p[1], 0) / zone.polygon.length;
          const color = zone.risk_level === 'CRITICAL' ? '#ef4444' : '#f97316';

          return (
            <Marker
              key={`epicenter-pulse-${zone.id}-${i}-${area}`}
              position={[centerLat, centerLng]}
              icon={L.divIcon({
                className: 'epicenter-pulse-ring-wrapper',
                html: `
                  <div style="position:relative; width:36px; height:36px; transform:translate(-50%, -50%); pointer-events:none;">
                    <div style="position:absolute; width:36px; height:36px; border-radius:50%; background:${color}; opacity:0.45; animation:pulse-ring 1.5s infinite;"></div>
                    <div style="position:absolute; top:4px; left:4px; width:28px; height:28px; border-radius:50%; background:#090d16; border:3px solid ${color}; box-shadow:0 0 16px ${color}; display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:12px; font-weight:800;">
                      ☢️
                    </div>
                  </div>
                `,
                iconSize: [36, 36],
                iconAnchor: [18, 18],
              })}
              zIndexOffset={1800}
            />
          );
        })}

        {/* DIRECTIONS & ROUTE POLYLINES (SHOW ONLY ON DIGITAL TWIN MAP & AI COMMANDER) */}
        {showDirections && (
          <>
            {/* ROUTE B (BYPASS ROUTE POLYLINE - HIGHLIGHTED GREEN/BLUE) */}
            {activeRouteData?.route_b?.coordinates?.length > 1 && (
              <>
                <Polyline
                  key={`polyline-b-${JSON.stringify(activeRouteData.route_b.coordinates[0])}-${activeRouteFocus}`}
                  positions={activeRouteData.route_b.coordinates}
                  pathOptions={{
                    color: activeRouteFocus === 'route_b' ? '#10b981' : '#475569',
                    weight: activeRouteFocus === 'route_b' ? 8 : 5,
                    opacity: activeRouteFocus === 'route_b' ? 1.0 : 0.6,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />

                {routeBMidpoint && (
                  <Marker
                    position={routeBMidpoint}
                    icon={createRouteBBadgeIcon(
                      activeRouteData.route_b.duration_min,
                      activeRouteData.route_b.distance_km,
                      bestRecommended === 'Route B'
                    )}
                    zIndexOffset={1200}
                    interactive={false}
                  />
                )}
              </>
            )}

            {/* ROUTE A (DIRECT ROUTE MULTI-COLOR POLYLINE) */}
            {activeRouteData?.coordinates?.length > 1 && (
              <>
                <Polyline
                  key={`polyline-a-${JSON.stringify(activeRouteData.coordinates[0])}-${activeRouteFocus}-${bestRecommended}`}
                  positions={activeRouteData.coordinates}
                  pathOptions={{
                    color: bestRecommended === 'Route B' ? '#ef4444' : '#3b82f6',
                    weight: activeRouteFocus === 'route_a' ? 8 : 6,
                    opacity: bestRecommended === 'Route B' ? 0.8 : 1.0,
                    dashArray: bestRecommended === 'Route B' ? '8 6' : undefined,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />

                {routeAMidpoint && (
                  <Marker
                    position={routeAMidpoint}
                    icon={createRouteABadgeIcon(
                      activeRouteData.route_a?.duration_min || activeRouteData.duration_min,
                      activeRouteData.route_a?.distance_km || activeRouteData.distance_km,
                      bestRecommended === 'Route A',
                      bestRecommended === 'Route B'
                    )}
                    zIndexOffset={1200}
                    interactive={false}
                  />
                )}
              </>
            )}

            {/* VISIBLE BLOCKED ROAD MARKER WITH LABEL */}
            {bestRecommended === 'Route B' && routeAMidpoint && (
              <Marker position={routeAMidpoint} icon={createBlockedRoadMarker('R1 BLOCKED FLOODED')} zIndexOffset={2000} />
            )}

            {/* 🔵 CLEAN CURRENT LOCATION / ORIGIN MARKER */}
            {activeRouteData && (
              <Marker position={activeRouteData.startPos} icon={currentLocationMarkerIcon}>
                <Popup><strong>🔵 ORIGIN: {aiDecisionTrace?.origin_location || `${(area || 'CHENNAI').toUpperCase()} TACTICAL COMMAND CENTER`}</strong></Popup>
              </Marker>
            )}

            {/* 🚁 ANIMATED RESCUE TEAM DEPLOYMENT MARKER */}
            {activeRouteData && aiDecisionTrace && (
              <Marker
                position={activeRouteData.startPos}
                icon={L.divIcon({
                  className: 'rescue-deployment-animated-marker',
                  html: `
                    <div style="background:#0f172a; border:2px solid #38bdf8; border-radius:14px; padding:4px 10px; box-shadow:0 0 16px #38bdf8; color:#ffffff; font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:800; display:flex; align-items:center; gap:6px; transform:translate(-50%, -50%); white-space:nowrap; animation:pulse-ring 1.5s infinite;">
                      <span style="font-size:14px;">🚁</span>
                      <span style="color:#38bdf8;">${aiDecisionTrace.required_teams || 6} RESCUE TEAMS DEPLOYING</span>
                    </div>
                  `,
                  iconSize: [200, 30],
                  iconAnchor: [100, 15],
                })}
                zIndexOffset={2500}
              />
            )}

            {/* 📍 CLEAN SHELTER PIN MARKER AT DESTINATION */}
            {activeRouteData && (
              <Marker position={activeRouteData.endPos} icon={shelterPinMarkerIcon}>
                <Popup>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                    <strong style={{ color: '#ea4335' }}>📍 DESTINATION RELIEF SHELTER</strong><br/>
                    {activeRouteData.shelterName}
                  </div>
                </Popup>
              </Marker>
            )}
          </>
        )}

        {/* Hospitals (H) */}
        {layers.hospitals && allHospitals.map((h, idx) => {
          const shortName = h.name.replace(' Hospital', '').replace(' GH', '').replace(' Fortis', '');
          return (
            <Marker key={`hosp-${h.id}-${idx}-${area}`} position={[h.lat, h.lng]} icon={createTacticalIcon(`H-${shortName}`, '#090d16', '#10b981', '🏥')}>
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                  <strong style={{ color: '#10b981' }}>🏥 HOSPITAL: {h.name}</strong><br/>
                  Capacity: {h.capacity} beds • Operational: {h.operational ? 'Yes' : 'No'}<br/>
                  Flood Risk Level: {Math.round((h.flood_risk || 0) * 100)}%
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Shelters (S) */}
        {layers.shelters && allShelters.map((s, idx) => {
          const shortName = s.name.replace(' Relief Shelter', '').replace(' Shelter', '').replace(' Center', '').replace(' Mandapam', '');
          return (
            <Marker key={`shelter-${s.id}-${idx}-${area}`} position={[s.lat, s.lng]} icon={createTacticalIcon(`S-${shortName}`, '#090d16', '#3b82f6', '🏠')}>
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                  <strong style={{ color: '#3b82f6' }}>🏠 RELIEF SHELTER: {s.name}</strong><br/>
                  Capacity: {s.capacity} • Current Occupancy: {s.current_occupancy}<br/>
                  Supplies Reserve: {s.supplies_days} Days
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Rescue Teams (R) */}
        {layers.rescue && allRescue.map((r, idx) => {
          const shortName = r.name.replace(' Rescue Unit', '').replace(' Team', '').replace(' Squad', '').replace(' NDRF', '');
          return (
            <Marker key={`rescue-${r.id}-${idx}-${area}`} position={[r.lat, r.lng]} icon={createTacticalIcon(`R-${shortName}`, '#090d16', '#f59e0b', '🚁')}>
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                  <strong style={{ color: '#f59e0b' }}>🚁 RESCUE TEAM: {r.name}</strong><br/>
                  Personnel: {r.personnel} • Rescue Boats: {r.boats}<br/>
                  Deployment Status: {(r.status || 'ACTIVE').toUpperCase()}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

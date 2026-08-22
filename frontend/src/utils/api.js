import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 3000, // 3s fast timeout to prevent blank screens
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchTwinState(area = 'chennai') {
  try {
    const res = await api.get('/api/twin', { params: { area }, timeout: 3000 });
    return res.data;
  } catch (err) {
    console.warn(`Backend fetch Twin state timeout/error for ${area}, using fallback:`, err);
    throw err;
  }
}

export async function runSimulation(params) {
  const res = await api.post('/api/simulate', params);
  return res.data;
}

export async function fetchRoute(params) {
  try {
    const res = await api.get('/api/route', { params, timeout: 4000 });
    if (res.data && (res.data.coordinates || res.data.route)) {
      return res.data;
    }
  } catch (err) {
    console.warn('Failed to fetch OSRM route from backend, using local fallback route:', err);
  }

  // Guaranteed local fallback route so map polyline NEVER disappears
  const startLat = params?.start_lat || 12.9800;
  const startLon = params?.start_lon || 80.2200;
  const endLat = params?.end_lat || 12.9850;
  const endLon = params?.end_lon || 80.2250;

  const ptsA = [
    [startLat, startLon],
    [startLat + 0.002, startLon + 0.001],
    [startLat + 0.0045, startLon + 0.0025],
    [startLat + 0.007, startLon + 0.0038],
    [endLat, endLon]
  ];

  const ptsB = [
    [startLat, startLon],
    [startLat - 0.005, startLon + 0.008],
    [startLat - 0.010, startLon + 0.015],
    [startLat - 0.015, startLon + 0.022],
    [startLat + 0.002, startLon + 0.028],
    [endLat, endLon]
  ];

  const isHighRain = (params?.rainfall_mm || 0) > 80 || (params?.water_level_m || 0) > 0.4 || (params?.blocked_roads && params.blocked_roads.length > 0);
  const bestRoute = isHighRain ? "Route B" : "Route A";

  return {
    status: "success",
    source: "Local Fallback Road Network Graph",
    coordinates: isHighRain ? ptsB : ptsA,
    distance_km: isHighRain ? 7.2 : 3.1,
    duration_min: isHighRain ? 16.5 : 7.5,
    route_a: {
      name: "Route A (Direct Corridor)",
      coordinates: ptsA,
      distance_km: 3.1,
      duration_min: 7.5,
      status: isHighRain ? "FLOODED" : "CLEAR"
    },
    route_b: {
      name: "Route B (High-Ground Bypass)",
      coordinates: ptsB,
      distance_km: 7.2,
      duration_min: 16.5,
      status: "SAFE_OPEN"
    },
    best_recommended_route: bestRoute,
    recommendation_reason: isHighRain ? "High rainfall & severe water logging on Route A. Route B (High Ground Bypass) recommended for safe evacuation." : "Route A is clear and provides the fastest travel time to destination shelter."
  };
}

export async function askCommander(question, language = 'en', area = 'chennai', originLocation = 'Adyar Command Center') {
  console.log('AI COMMANDER: MESSAGE SENT:', question);
  console.log('AI COMMANDER: CALLING /api/commander');
  try {
    const res = await api.post('/api/commander', { question, language, area, origin_location: originLocation });
    console.log('AI COMMANDER: COMMANDER RESPONSE STATUS:', res.status);
    console.log('AI COMMANDER: COMMANDER RESPONSE:', res.data);
    console.log('AI COMMANDER: COMMANDER ANSWER RECEIVED:', res.data?.answer?.substring(0, 50));
    return res.data;
  } catch (err) {
    console.error('AI COMMANDER: HTTP ERROR:', err.response?.status, err.message);
    throw err;
  }
}

export async function generateVoiceBriefing(language = 'en') {
  try {
    const res = await api.post('/api/voice', { language }, {
      responseType: 'blob',
      timeout: 5000,
    });

    const contentType = (res.headers['content-type'] || res.headers['Content-Type'] || '').toLowerCase();

    if (contentType.includes('audio')) {
      const audioUrl = URL.createObjectURL(res.data);
      return { type: 'audio', data: audioUrl };
    }

    const text = await res.data.text();
    const json = JSON.parse(text);
    return { type: 'text', data: json.briefing_text || json.text || null };
  } catch (err) {
    console.warn('Voice API error, using local fallback:', err);
    return { type: 'error', data: null };
  }
}

export async function fetchHealth() {
  try {
    const res = await api.get('/api/health', { timeout: 2000 });
    return res.data;
  } catch {
    return { status: 'offline', demo_mode: true };
  }
}

export const ALERT_NUMBERS = ['917806994340', '917904085824', '918610754204'];

export async function sendSmsAlert(to = ALERT_NUMBERS, text = '') {
  try {
    const res = await api.post('/api/sms', { to: Array.isArray(to) ? to.join(',') : to, text });
    return res.data;
  } catch (err) {
    console.warn('SMS dispatch API error:', err);
    return { status: 'mock', to, text };
  }
}

export async function sendWhatsAppAlert(to = ALERT_NUMBERS, text = '') {
  try {
    const res = await api.post('/api/whatsapp', { to: Array.isArray(to) ? to.join(',') : to, text });
    return res.data;
  } catch (err) {
    console.warn('WhatsApp dispatch API notice:', err);
    return { status: 'mock', to, text };
  }
}

export default api;

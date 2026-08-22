import { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Pause, Radio, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { generateVoiceBriefing } from '../utils/api';

export default function VoiceBriefing({ twinState, language = 'en' }) {
  const zones = twinState?.zones || [];
  const sorted = [...zones].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
  const top = sorted[0] || {};
  const critical = zones.filter(z => z.risk_level === 'CRITICAL');
  const high = zones.filter(z => z.risk_level === 'HIGH');
  const affected = [...critical, ...high];
  const totalAffected = (affected.length > 0 ? affected : [top]).reduce((s, z) => s + (z.population || 0), 0);

  const severity = critical.length > 0 ? 'CRITICAL' : (high.length > 0 ? 'HIGH' : 'MODERATE');

  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [briefingText, setBriefingText] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDemoAudio, setIsDemoAudio] = useState(false);

  const audioRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis || null);

  // Clear audio & briefing text when language changes so it NEVER retains English in Tamil mode
  useEffect(() => {
    setAudioUrl(null);
    setBriefingText(null);
    setIsPlaying(false);
    if (synthRef.current) synthRef.current.cancel();
  }, [language]);

  // Clean up Blob URLs & SpeechSynthesis on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [audioUrl]);

  // Find best speech voice for selected language
  const selectVoice = (utterance, lang) => {
    if (!synthRef.current) return;
    const voices = synthRef.current.getVoices() || [];
    if (lang === 'ta') {
      const tamilVoice = voices.find(v => (v.lang && (v.lang.includes('ta') || v.lang.includes('TA'))) || (v.name && v.name.toLowerCase().includes('tamil')));
      const indianVoice = voices.find(v => v.lang && (v.lang.includes('hi-IN') || v.lang.includes('en-IN')));
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      } else if (indianVoice) {
        utterance.voice = indianVoice;
      }
    }
  };

  const handleGenerateAndPlay = async () => {
    console.log(`VOICE BUTTON CLICKED (${language.toUpperCase()})`);
    setLoading(true);
    setErrorMsg(null);
    setIsPlaying(false);

    if (synthRef.current) synthRef.current.cancel();

    try {
      const result = await generateVoiceBriefing(language);

      if (result.type === 'audio' && result.data) {
        setAudioUrl(result.data);
        setIsDemoAudio(false);
        setBriefingText(null);

        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play()
              .then(() => setIsPlaying(true))
              .catch(err => console.warn('Playback block:', err));
          }
        }, 100);

      } else {
        // Demo Speech Fallback (Web Speech API)
        const text = result.data || generateFallbackBriefing(twinState, language);
        setBriefingText(text);
        setIsDemoAudio(true);

        if (synthRef.current && 'SpeechSynthesisUtterance' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = language === 'ta' ? 'ta-IN' : 'en-US';
          utterance.rate = language === 'ta' ? 0.9 : 1.0;
          utterance.pitch = 1.0;
          selectVoice(utterance, language);

          utterance.onstart = () => setIsPlaying(true);
          utterance.onend = () => setIsPlaying(false);
          utterance.onerror = () => setIsPlaying(false);

          synthRef.current.speak(utterance);
        }
      }
    } catch (err) {
      console.error('Voice generation failed:', err);
      setErrorMsg('VOICE GENERATION FAILED — Emergency briefing text is available below.');
      setBriefingText(generateFallbackBriefing(twinState, language));
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else if (isDemoAudio && briefingText && synthRef.current) {
      if (isPlaying) {
        synthRef.current.cancel();
        setIsPlaying(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(briefingText);
        utterance.lang = language === 'ta' ? 'ta-IN' : 'en-US';
        utterance.rate = language === 'ta' ? 0.9 : 1.0;
        selectVoice(utterance, language);
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        synthRef.current.speak(utterance);
      }
    }
  };

  return (
    <div className="voice-section">
      <div className="voice-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Volume2 size={16} className="voice-header-icon" />
          <span className="voice-header-title">
            {language === 'ta' ? '🤖 AI அவசர குரல் அறிக்கை (TAMIL VOICE)' : '🤖 AI EMERGENCY BRIEFING'}
          </span>
        </div>
        <span className="sim-data-badge" style={{ background: language === 'ta' ? 'rgba(245, 158, 11, 0.2)' : undefined, color: language === 'ta' ? '#fbbf24' : undefined, borderColor: language === 'ta' ? '#f59e0b' : undefined }}>
          {language === 'ta' ? '🇮🇳 தமிழ் குரல்' : (isDemoAudio ? 'DEMO VOICE FALLBACK' : 'SIMULATION DATA')}
        </span>
      </div>

      {/* Incident Summary Card */}
      <div className="incident-summary-card">
        <div className="summary-card-row">
          <span className="card-lbl">{language === 'ta' ? 'சம்பவம்:' : 'INCIDENT:'}</span>
          <span className="card-val">{language === 'ta' ? 'நகர்ப்புற வெள்ள அவசரநிலை' : 'Urban Flood Emergency'}</span>
        </div>
        <div className="summary-card-row">
          <span className="card-lbl">{language === 'ta' ? 'அபாய நிலை:' : 'SEVERITY:'}</span>
          <span className={`card-val severity-${severity.toLowerCase()}`}>
            {severity}
          </span>
        </div>
        <div className="summary-card-row">
          <span className="card-lbl">{language === 'ta' ? 'பாதிக்கப்பட்ட மக்கள்:' : 'AFFECTED POPULATION:'}</span>
          <span className="card-val">{totalAffected.toLocaleString()}</span>
        </div>
        <div className="summary-card-row">
          <span className="card-lbl">{language === 'ta' ? 'முக்கிய அபாய பகுதி:' : 'PRIORITY ZONE:'}</span>
          <span className="card-val highlight">{top.name || 'Velachery'} ({Math.round((top.risk_score || 0) * 100)}%)</span>
        </div>
        <div className="summary-card-row">
          <span className="card-lbl">{language === 'ta' ? 'பரிந்துரை:' : 'RECOMMENDED ACTION:'}</span>
          <span className="card-val action">{language === 'ta' ? 'உடனடி பாதுகாப்பான வெளியேற்றம்' : 'Immediate Priority Evacuation'}</span>
        </div>
      </div>

      {/* Fail-Safe Error UI */}
      {errorMsg && (
        <div className="fail-safe-error" style={{ marginBottom: 10, padding: 8, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--risk-critical)', borderRadius: 6, fontSize: 11, color: 'var(--risk-critical)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={handleGenerateAndPlay} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-primary)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-primary)', cursor: 'pointer', fontSize: 10 }}>
            Retry
          </button>
        </div>
      )}

      {/* Play / Generate Button */}
      <button
        className={`voice-btn ${isPlaying ? 'playing' : ''}`}
        onClick={(audioUrl || briefingText) ? togglePlay : handleGenerateAndPlay}
        disabled={loading}
      >
        {loading ? (
          <><div className="spinner" /> {language === 'ta' ? 'தமிழ் குரல் உருவாக்கம்...' : 'Synthesizing Audio Briefing...'}</>
        ) : isPlaying ? (
          <><Pause size={16} /> {language === 'ta' ? 'குரலை நிறுத்து' : 'PAUSE AI BRIEFING'}</>
        ) : (audioUrl || briefingText) ? (
          <><Play size={16} /> ▶ {language === 'ta' ? 'தமிழ் குரல் அறிக்கை இயக்கு' : 'PLAY AI BRIEFING'}</>
        ) : (
          <><Play size={16} /> ▶ {language === 'ta' ? 'தமிழ் குரல் அறிக்கை உருவாக்கு & இயக்கு' : 'GENERATE & PLAY AI BRIEFING'}</>
        )}
      </button>

      {/* Audio Waveform Indicator */}
      {isPlaying && (
        <div className="audio-playing-banner">
          <Radio size={14} className="banner-icon" />
          <span>{language === 'ta' ? 'AI தளபதி அவசர தமிழ் குரல் ஒலிபரப்பு' : 'AI COMMANDER BROADCASTING EMERGENCY AUDIO'}</span>
          <div className="waveform">
            <span /><span /><span /><span /><span />
          </div>
        </div>
      )}

      {/* Audio Element for ElevenLabs Stream */}
      {audioUrl && (
        <div className="voice-audio-player" style={{ marginTop: 8 }}>
          <audio
            ref={audioRef}
            controls
            src={audioUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            style={{ width: '100%', height: 32 }}
          />
        </div>
      )}

      {/* Text Preview Summary */}
      {briefingText && (
        <div className="voice-text-preview">
          <div className="preview-header">
            <CheckCircle size={12} /> {language === 'ta' ? 'தமிழ் அவசர குரல் உரை சுருக்கம்' : 'VERBAL BRIEFING TEXT SUMMARY'}
          </div>
          {briefingText}
        </div>
      )}
    </div>
  );
}

function generateFallbackBriefing(twinState, language = 'en') {
  const zones = twinState?.zones || [];
  const sorted = [...zones].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
  const top = sorted[0] || {};
  const affected = zones.filter(z => z.risk_level === 'HIGH' || z.risk_level === 'CRITICAL');
  const totalAffected = (affected.length > 0 ? affected : [top]).reduce((s, z) => s + (z.population || 0), 0);

  if (language === 'ta') {
    return `அவசரநிலை கள அறிக்கை: சென்னை மண்டலங்களில் வெள்ள அபாயம். முக்கிய அபாய பகுதி: ${top.name || 'வேளச்சேரி'} (${Math.round((top.risk_score || 0) * 100)} சதவீதம் அபாயம்). பாதிக்கப்பட்ட மக்கள் தொகை: ${totalAffected.toLocaleString()} நபர்கள். பரிந்துரை: வேளச்சேரி மற்றும் மடிப்பாக்கம் பகுதியிலிருந்து மக்களை உடனடியாக பாதுகாப்பான இடத்திற்கு வெளியேற்றவும்.`;
  }

  return `EMERGENCY BRIEFING BROADCAST: Urban flood alert across ${zones.length} sectors. Severity level CRITICAL. Priority zone: ${top.name || 'Velachery'} at ${Math.round((top.risk_score || 0) * 100)}% risk score. Affected population: ${totalAffected.toLocaleString()}. Recommended action: Execute immediate priority evacuation, deploy rescue boats, and activate emergency shelters. End of transmission.`;
}

import { Clock, Activity } from 'lucide-react';

export default function Timeline({ simulating, progress, stepLabel }) {
  const markers = ['NOW', '+1H', '+6H', '+12H', '+24H'];
  const pct = simulating ? (progress || 0) : (progress || 20);

  return (
    <div className="timeline-bar">
      <div className="timeline-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {simulating ? (
          <Activity size={13} className="spin-icon" style={{ color: 'var(--risk-critical)' }} />
        ) : (
          <Clock size={13} style={{ color: 'var(--accent-cyan)' }} />
        )}
        <span>TIMELINE {stepLabel ? `(${stepLabel})` : ''}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div className="timeline-track">
          <div
            className="timeline-progress"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="timeline-markers" style={{ marginTop: 4 }}>
          {markers.map((m, i) => (
            <span
              className={`timeline-marker ${stepLabel === m ? 'active-step' : ''}`}
              key={i}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

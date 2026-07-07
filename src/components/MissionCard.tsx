import type { Mission } from "../types/mission";

import "../styles/mission-card.css";

type MissionCardProps = {
  mission: Mission;
};

export function MissionCard({ mission }: MissionCardProps) {
  return (
    <article className="mission-card">
      <div className="mission-card-image">
        <img src={mission.image} alt={`${mission.title} tactical map`} />
      </div>

      <div className="mission-card-header">
        <div>
          <h2>{mission.title}</h2>
          <span>{mission.district}</span>
        </div>

        <strong className={`mission-priority ${mission.priority.toLowerCase()}`}>
          {mission.priority}
        </strong>
      </div>

      <p>{mission.description}</p>

      <div className="mission-meta">
        <span>{mission.assignedUnit}</span>
        <strong className={`mission-status ${mission.status.toLowerCase()}`}>
          {mission.status}
        </strong>
      </div>

      <div className="mission-meta">
        <span>ETA {mission.eta}</span>
        <strong>{mission.riskLevel}% RISK</strong>
      </div>

      <div className="mission-progress">
        <div className="mission-progress-header">
          <span>Progress</span>
          <strong>{mission.progress}%</strong>
        </div>

        <div className="mission-progress-bar">
          <div style={{ width: `${mission.progress}%` }} />
        </div>
      </div>
    </article>
  );
}

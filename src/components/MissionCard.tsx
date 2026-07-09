import type { Mission } from "../types/mission";
import { useTiltCard } from "../hooks/useTiltCard";
import { InterfaceIcon } from "./InterfaceIcon";

import "../styles/mission-card.css";

type MissionCardProps = {
  mission: Mission;
  onResolve?: () => void;
};

export function MissionCard({ mission, onResolve }: MissionCardProps) {
  const tiltCard = useTiltCard();
  const code = mission.title
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3);

  return (
    <article className="mission-card" {...tiltCard}>
      <div className="mission-card-image">
        <InterfaceIcon name="crosshair" />
        <span>{code}</span>
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
        {onResolve && (
          <button
            className="card-action"
            disabled={mission.status === "COMPLETED"}
            onClick={onResolve}
          >
            {mission.status === "COMPLETED" ? "Operation complete" : "Resolve operation"}
          </button>
        )}
      </div>
    </article>
  );
}

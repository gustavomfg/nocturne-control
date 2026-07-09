import type { Gadget } from "../types/gadget";
import { useTiltCard } from "../hooks/useTiltCard";
import { InterfaceIcon } from "./InterfaceIcon";

import "../styles/gadget-card.css";

type GadgetCardProps = {
  gadget: Gadget;
  onDeploy?: () => void;
};

export function GadgetCard({ gadget, onDeploy }: GadgetCardProps) {
  const tiltCard = useTiltCard();
  const code = gadget.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3);

  return (
    <article className="gadget-card" {...tiltCard}>
      <div className="gadget-card-image">
        <InterfaceIcon name="shield" />
        <span>{code}</span>
      </div>

      <div className="gadget-card-header">
        <div>
          <h2>{gadget.name}</h2>
          <span>{gadget.category}</span>
        </div>

        <strong className={`gadget-status ${gadget.status.toLowerCase()}`}>
          {gadget.status}
        </strong>
      </div>

      <p>{gadget.description}</p>

      <p>{gadget.deploymentHistory}</p>

      <div className="power">
        <div className="power-header">
          <span>{gadget.lastMaintenance}</span>
          <strong>{gadget.powerLevel}%</strong>
        </div>

        <div className="power-bar">
          <div style={{ width: `${gadget.powerLevel}%` }} />
        </div>
        {onDeploy && (
          <button
            className="card-action"
            disabled={gadget.status === "MAINTENANCE"}
            onClick={onDeploy}
          >
            {gadget.status === "MAINTENANCE" ? "Maintenance locked" : "Deploy to priority mission"}
          </button>
        )}
      </div>
    </article>
  );
}

import type { Gadget } from "../types/gadget";
import { useTiltCard } from "../hooks/useTiltCard";

import "../styles/gadget-card.css";

type GadgetCardProps = {
  gadget: Gadget;
};

export function GadgetCard({ gadget }: GadgetCardProps) {
  const tiltCard = useTiltCard();

  return (
    <article className="gadget-card" {...tiltCard}>
      <div className="gadget-card-image">
        <img src={gadget.image} alt={`${gadget.name} WayneTech profile`} />
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
      </div>
    </article>
  );
}

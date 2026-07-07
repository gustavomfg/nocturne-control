import type { Villain } from "../types/villain";
import { useTiltCard } from "../hooks/useTiltCard";
import { asset } from "../utils/assets";

import "../styles/villain-card.css";

type VillainCardProps = {
  villain: Villain;
  onOpen?: () => void;
};

export function VillainCard({ villain, onOpen }: VillainCardProps) {
  const tiltCard = useTiltCard();

  return (
    <article
      className="villain-card"
      {...tiltCard}
      onClick={onOpen}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && onOpen) {
          event.preventDefault();
          onOpen();
        }
      }}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="villain-card-image">
        <img src={asset(villain.image)} alt={`${villain.name} surveillance profile`} />
      </div>

      <div className="villain-card-header">
        <div>
          <h2>{villain.name}</h2>
          <span>{villain.alias}</span>
        </div>

        <strong className={`status ${villain.status.toLowerCase()}`}>
          {villain.status}
        </strong>
      </div>

      <div className="villain-info">
        <p>
          <span>Threat Level:</span> {villain.dangerLevel}
        </p>

        <p>
          <span>Last Location:</span> {villain.lastLocation}
        </p>

        <p>
          <span>First Seen:</span> {villain.firstSeen}
        </p>
      </div>

      <p className="villain-description">{villain.description}</p>

      <p className="villain-description">{villain.threatNotes}</p>
    </article>
  );
}

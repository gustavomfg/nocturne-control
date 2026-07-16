import type { Villain } from "../types/villain.ts";
import { useTiltCard } from "../hooks/useTiltCard.ts";
import { InterfaceIcon } from "./InterfaceIcon.tsx";

import "../styles/villain-card.css";

type VillainCardProps = {
  villain: Villain;
  onOpen?: () => void;
};

export function VillainCard({ villain, onOpen }: VillainCardProps) {
  const tiltCard = useTiltCard();
  const initials = villain.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  const content = <>
      <div className="villain-card-image">
        <InterfaceIcon name="target" />
        <span>{initials}</span>
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
    </>;

  if (onOpen) {
    return <button type="button" className="villain-card villain-card-button" {...tiltCard} onClick={onOpen} aria-label={`Open target file: ${villain.name}`}>
      {content}
    </button>;
  }

  return <article className="villain-card" {...tiltCard}>{content}</article>;
}

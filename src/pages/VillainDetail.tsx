import { useNocturne } from "../state/useNocturne";
import { slugify } from "../utils/slug";

import "../styles/villain-detail.css";

type VillainDetailProps = {
  slug: string;
  onBack: () => void;
};

export function VillainDetail({ slug, onBack }: VillainDetailProps) {
  const { villains, logs, captureVillain } = useNocturne();
  const villain = villains.find((item) => slugify(item.name) === slug);

  if (!villain) {
    return (
      <main className="villain-detail">
        <button className="back-button" onClick={onBack}>Back to Gravemere</button>
        <h1>File Not Found</h1>
        <p>Gravemere archive could not locate this dossier.</p>
      </main>
    );
  }

  const relatedLogs = logs.filter((log) => log.message.toLowerCase().includes(villain.name.toLowerCase()));

  return (
    <main className="villain-detail">
      <button className="back-button" onClick={onBack}>Back to Gravemere</button>

      <section className="villain-dossier">
        <div className="dossier-sigil" aria-hidden="true">
          {villain.name.slice(0, 2).toUpperCase()}
        </div>

        <div>
          <span className="dossier-label">GRAVEMERE DOSSIER</span>
          <h1>{villain.name}</h1>
          <strong>{villain.status} / {villain.dangerLevel}</strong>
          <p>{villain.description}</p>

          <button disabled={villain.status === "CAPTURED"} onClick={() => captureVillain(villain.id)}>
            {villain.status === "CAPTURED" ? "Contained" : "Capture Target"}
          </button>
        </div>
      </section>

      <section className="dossier-grid">
        <article>
          <h2>Last Known Location</h2>
          <p>{villain.lastLocation}</p>
        </article>

        <article>
          <h2>First Seen</h2>
          <p>{villain.firstSeen}</p>
        </article>

        <article>
          <h2>Known Associates</h2>
          <p>{villain.knownAssociates.join(" / ")}</p>
        </article>

        <article>
          <h2>Threat Notes</h2>
          <p>{villain.threatNotes}</p>
        </article>
      </section>

      <section className="dossier-logs">
        <h2>Related Timeline</h2>

        {relatedLogs.length > 0 ? relatedLogs.map((log) => (
          <p key={log.id}><span>{log.timestamp}</span> {log.message}</p>
        )) : <p>No session events for this target yet.</p>}
      </section>
    </main>
  );
}

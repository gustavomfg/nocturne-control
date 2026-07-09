import { VillainCard } from "../components/VillainCard";
import { useNocturne } from "../state/useNocturne";

import "../styles/gravemere.css";

type GravemereProps = {
  onOpenVillain: (villainName: string) => void;
};

export function Gravemere({ onOpenVillain }: GravemereProps) {
  const { villains } = useNocturne();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const visibleVillains = useMemo(() => villains.filter((villain) =>
    (status === "ALL" || villain.status === status) &&
    `${villain.name} ${villain.alias} ${villain.lastLocation}`.toLowerCase().includes(query.toLowerCase())
  ), [query, status, villains]);

  return (
    <main className="gravemere">
      <header className="gravemere-header">
        <div>
          <h1>Gravemere Archive</h1>
          <p>Villain records and containment status.</p>
        </div>

        <strong>SECURITY LEVEL: OMEGA</strong>
      </header>
      <div className="collection-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search targets, aliases or locations..." aria-label="Search target archive" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter target status">
          <option value="ALL">All targets</option><option value="ESCAPED">Escaped</option><option value="UNKNOWN">Unknown</option><option value="CAPTURED">Captured</option>
        </select>
      </div>

      <section className="villains-grid">
        {visibleVillains.map((villain) => (
          <VillainCard key={villain.id} villain={villain} onOpen={() => onOpenVillain(villain.name)} />
        ))}
        {visibleVillains.length === 0 && <div className="collection-empty"><strong>No target file found</strong><p>Adjust archive search parameters.</p></div>}
      </section>
    </main>
  );
}
import { useMemo, useState } from "react";

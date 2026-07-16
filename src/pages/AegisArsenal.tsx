import { GadgetCard } from "../components/GadgetCard.tsx";
import { useNocturne } from "../state/useNocturne.ts";

import "../styles/aegis-arsenal.css";

export function AegisArsenal() {
  const { gadgets, deployGadget } = useNocturne();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const visibleGadgets = useMemo(() => gadgets.filter((gadget) =>
    (status === "ALL" || gadget.status === status) &&
    `${gadget.name} ${gadget.category}`.toLowerCase().includes(query.toLowerCase())
  ), [gadgets, query, status]);

  return (
    <main className="aegis">
      <header className="aegis-header">
        <div>
          <h1>Aegis Arsenal</h1>
          <p>Equipment, vehicles and tactical systems.</p>
        </div>

        <strong>LAB STATUS: ACTIVE</strong>
      </header>
      <div className="collection-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Aegis assets..." aria-label="Search Aegis assets" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter asset status">
          <option value="ALL">All statuses</option><option value="AVAILABLE">Available</option><option value="DEPLOYED">Deployed</option><option value="MAINTENANCE">Maintenance</option>
        </select>
      </div>

      <section className="gadgets-grid">
        {visibleGadgets.map((gadget) => (
          <GadgetCard key={gadget.id} gadget={gadget} onDeploy={() => deployGadget(gadget.id)} />
        ))}
        {visibleGadgets.length === 0 && <div className="collection-empty"><strong>No asset indexed</strong><p>Try a different name or status.</p></div>}
      </section>
    </main>
  );
}
import { useMemo, useState } from "react";

import { GadgetCard } from "../components/GadgetCard";
import { useNocturne } from "../state/useNocturne";

import "../styles/aegis-arsenal.css";

export function AegisArsenal() {
  const { gadgets } = useNocturne();

  return (
    <main className="aegis">
      <header className="aegis-header">
        <div>
          <h1>Aegis Arsenal</h1>
          <p>Equipment, vehicles and tactical systems.</p>
        </div>

        <strong>LAB STATUS: ACTIVE</strong>
      </header>

      <section className="gadgets-grid">
        {gadgets.map((gadget) => (
          <GadgetCard key={gadget.id} gadget={gadget} />
        ))}
      </section>
    </main>
  );
}

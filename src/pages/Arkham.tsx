import { VillainCard } from "../components/VillainCard";
import { villains } from "../data/villains";

import "../styles/arkham.css";

export function Arkham() {
  return (
    <main className="arkham">
      <header className="arkham-header">
        <div>
          <h1>Arkham Database</h1>
          <p>Villain records and containment status.</p>
        </div>

        <strong>SECURITY LEVEL: OMEGA</strong>
      </header>

      <section className="villains-grid">
        {villains.map((villain) => (
          <VillainCard key={villain.id} villain={villain} />
        ))}
      </section>
    </main>
  );
}
import { VillainCard } from "../components/VillainCard";
import { useNocturne } from "../state/useNocturne";

import "../styles/gravemere.css";

type GravemereProps = {
  onOpenVillain: (villainName: string) => void;
};

export function Gravemere({ onOpenVillain }: GravemereProps) {
  const { villains } = useNocturne();

  return (
    <main className="gravemere">
      <header className="gravemere-header">
        <div>
          <h1>Gravemere Archive</h1>
          <p>Villain records and containment status.</p>
        </div>

        <strong>SECURITY LEVEL: OMEGA</strong>
      </header>

      <section className="villains-grid">
        {villains.map((villain) => (
          <VillainCard key={villain.id} villain={villain} onOpen={() => onOpenVillain(villain.name)} />
        ))}
      </section>
    </main>
  );
}

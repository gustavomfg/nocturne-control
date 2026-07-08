import { MissionCard } from "../components/MissionCard";
import { useNocturne } from "../state/useNocturne";

import "../styles/missions.css";

export function Missions() {
  const { missions } = useNocturne();

  return (
    <main className="missions">
      <header className="missions-header">
        <div>
          <h1>Mission Control</h1>
          <p>Active Nocturne operations and tactical objectives.</p>
        </div>

        <strong>OPERATIONS: {missions.length}</strong>
      </header>

      <section className="missions-grid">
        {missions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} />
        ))}
      </section>
    </main>
  );
}

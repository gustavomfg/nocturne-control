import { MissionCard } from "../components/MissionCard";
import { missions } from "../data/missions";

import "../styles/missions.css";

export function Missions() {
  return (
    <main className="missions">
      <header className="missions-header">
        <div>
          <h1>Mission Control</h1>
          <p>Active Gotham operations and tactical objectives.</p>
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
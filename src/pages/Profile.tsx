import { useNocturne } from "../state/useNocturne";

import "../styles/profile.css";

export function Profile() {
  const { missions, gadgets } = useNocturne();
  const activeCases = missions.filter((mission) => mission.status === "ACTIVE").length;
  const deployedAssets = gadgets.filter((gadget) => gadget.status === "DEPLOYED").length;

  return (
    <main className="profile-page">
      <header className="profile-header">
        <div>
          <span>FIELD OPERATIVE FILE</span>
          <h1>Orion Vale / Night Sentinel</h1>
          <p>Field readiness, active case load and current tactical equipment state.</p>
        </div>
      </header>

      <section className="profile-hero">
        <div className="profile-sigil" aria-hidden="true">NV</div>

        <div>
          <span>ACTIVE OPERATIVE</span>
          <h2>The Night Sentinel</h2>
          <p>Primary field asset for Nocturne Control. Identity file restricted to Aegis black-level clearance.</p>
        </div>
      </section>

      <section className="profile-grid">
        <article className="profile-card identity-card">
          <h2>Vitals</h2>
          <strong>OPERATIONAL</strong>
          <p>Health nominal. Sleep deficit elevated. Combat readiness within acceptable threshold.</p>
        </article>

        <article className="profile-card">
          <h2>Active Case Files</h2>
          <strong>{activeCases}</strong>
          <p>Mission load synced with Nocturne Control operations.</p>
        </article>

        <article className="profile-card">
          <h2>Equipment Sync</h2>
          <strong>{deployedAssets}</strong>
          <p>Aegis assets currently deployed or telemetry-linked.</p>
        </article>

        <article className="profile-card profile-wide">
          <h2>Current Protocol</h2>
          <p>Maintain Gravemere containment priority. Avoid public exposure unless Night Signal relay confirms civilian risk escalation.</p>
        </article>
      </section>
    </main>
  );
}

import { useGotham } from "../state/useGotham";
import { asset } from "../utils/assets";

import "../styles/profile.css";

export function Profile() {
  const { missions, gadgets } = useGotham();
  const activeCases = missions.filter((mission) => mission.status === "ACTIVE").length;
  const deployedAssets = gadgets.filter((gadget) => gadget.status === "DEPLOYED").length;

  return (
    <main className="profile-page">
      <header className="profile-header">
        <div>
          <span>WAYNE IDENTITY FILE</span>
          <h1>Bruce Wayne / Batman</h1>
          <p>Field readiness, active case load and current tactical equipment state.</p>
        </div>
      </header>

      <section className="profile-hero">
        <img src={asset("/profile/batman-profile.jpg")} alt="Batman holding his cowl in silhouette" />

        <div>
          <span>ACTIVE OPERATIVE</span>
          <h2>The Dark Knight</h2>
          <p>Primary field asset for Gotham Control. Identity file restricted to WayneTech black-level clearance.</p>
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
          <p>Mission load synced with Gotham Control operations.</p>
        </article>

        <article className="profile-card">
          <h2>Equipment Sync</h2>
          <strong>{deployedAssets}</strong>
          <p>WayneTech assets currently deployed or telemetry-linked.</p>
        </article>

        <article className="profile-card profile-wide">
          <h2>Current Protocol</h2>
          <p>Maintain Arkham containment priority. Avoid public exposure unless Bat-Signal relay confirms civilian risk escalation.</p>
        </article>
      </section>
    </main>
  );
}

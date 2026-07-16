import { useState } from "react";
import { useNocturne } from "../state/useNocturne.ts";

import "../styles/profile.css";

export function Profile() {
  const { operatorName, setOperatorName, missions, gadgets } = useNocturne();
  const [name, setName] = useState(operatorName);
  const activeCases = missions.filter((mission) => mission.status === "ACTIVE").length;
  const deployedAssets = gadgets.filter((gadget) => gadget.status === "DEPLOYED").length;

  return (
    <main className="profile-page">
      <header className="profile-header">
        <div>
          <span>FIELD OPERATIVE FILE</span>
          <h1>{operatorName || "Unknown Operator"} / Night Sentinel</h1>
          <p>Field readiness, active case load and current tactical equipment state.</p>
        </div>
      </header>

      <section className="profile-hero">
        <div className="profile-sigil" aria-hidden="true">
          {(operatorName || "NS").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
        </div>

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

        <form className="profile-card profile-wide profile-identity" onSubmit={(event) => {
          event.preventDefault();
          setOperatorName(name);
        }}>
          <h2>Operator Identity</h2>
          <label htmlFor="profile-name">Display name</label>
          <div>
            <input id="profile-name" value={name} maxLength={32} onChange={(event) => setName(event.target.value)} />
            <button type="submit" disabled={!name.trim() || name.trim() === operatorName}>Update identity</button>
          </div>
        </form>
      </section>
    </main>
  );
}

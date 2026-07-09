import { MissionCard } from "../components/MissionCard";
import { useNocturne } from "../state/useNocturne";

import "../styles/missions.css";

export function Missions() {
  const { missions, resolveMission } = useNocturne();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("risk");
  const visibleMissions = useMemo(() => missions
    .filter((mission) => status === "ALL" || mission.status === status)
    .filter((mission) => `${mission.title} ${mission.district}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === "risk" ? b.riskLevel - a.riskLevel : a.title.localeCompare(b.title)),
  [missions, query, sort, status]);

  return (
    <main className="missions">
      <header className="missions-header">
        <div>
          <h1>Mission Control</h1>
          <p>Active Nocturne operations and tactical objectives.</p>
        </div>

        <strong>OPERATIONS: {missions.length}</strong>
      </header>
      <div className="collection-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search missions or districts..." aria-label="Search missions" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter mission status">
          <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="WAITING">Waiting</option><option value="COMPLETED">Completed</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort missions">
          <option value="risk">Highest risk</option><option value="name">Name</option>
        </select>
      </div>

      <section className="missions-grid">
        {visibleMissions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} onResolve={() => resolveMission(mission.id)} />
        ))}
        {visibleMissions.length === 0 && <div className="collection-empty"><strong>No mission signal found</strong><p>Adjust the current search or status filter.</p></div>}
      </section>
    </main>
  );
}
import { useMemo, useState } from "react";

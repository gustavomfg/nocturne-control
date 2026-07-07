import { useEffect, useState } from "react";

import { villains } from "../data/villains";
import { gadgets } from "../data/gadgets";
import { missions } from "../data/missions";

import "../styles/dashboard.css";

export function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  const escapedVillains = villains.filter(
    (villain) => villain.status === "ESCAPED"
  ).length;

  const activeMissions = missions.filter(
    (mission) => mission.status === "ACTIVE"
  ).length;

  const availableGadgets = gadgets.filter(
    (gadget) => gadget.status === "AVAILABLE"
  ).length;

  const cityThreatLevel = Math.round(
    missions.reduce((total, mission) => total + mission.riskLevel, 0) / missions.length
  );

  const criticalMission = missions.reduce((highestRisk, mission) =>
    mission.riskLevel > highestRisk.riskLevel ? mission : highestRisk
  );

  const mostWanted = villains.find((villain) => villain.status === "ESCAPED");

  const incidentFeed = [
    "Arkham perimeter camera lost signal for 12 seconds.",
    `${criticalMission.assignedUnit} reports movement near ${criticalMission.district}.`,
    "Rain interference elevated across rooftop relay network.",
    mostWanted
      ? `${mostWanted.name} profile flagged near ${mostWanted.lastLocation}.`
      : "No escaped target currently locked.",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Gotham Live Monitor</h1>
          <p>Real-time tactical overview from the Batcomputer.</p>
        </div>

        <strong>{formattedTime}</strong>
      </header>

      <section className="dashboard-content">
        <article className="radar-panel">
          <div className="radar-frame">
            <div className="radar-label">GCPD / WAYNETECH GRID</div>

            <div className="radar">
              <div className="radar-map" />
              <div className="radar-sweep" />
              <div className="radar-contact contact-one" />
              <div className="radar-contact contact-two" />
              <div className="radar-contact contact-three" />
            </div>

            <div className="radar-readout">
              <span>SECTOR 07</span>
              <span>RAIN INTERFERENCE</span>
              <span>3 CONTACTS</span>
            </div>
          </div>

          <h2>City Surveillance</h2>
          <p>Low-visibility scan across central Gotham and Arkham perimeter.</p>
        </article>

        <div className="dashboard-mainframe">
          <section className="status-grid">
            <article>
              <h2>CITY STATUS</h2>
              <strong>DANGER</strong>
            </article>

            <article>
              <h2>BAT SIGNAL</h2>
              <strong>ONLINE</strong>
            </article>

            <article>
              <h2>ESCAPED VILLAINS</h2>
              <strong>{escapedVillains}</strong>
            </article>

            <article>
              <h2>ACTIVE MISSIONS</h2>
              <strong>{activeMissions}</strong>
            </article>

            <article>
              <h2>AVAILABLE GADGETS</h2>
              <strong>{availableGadgets}</strong>
            </article>

            <article>
              <h2>ARKHAM STATUS</h2>
              <strong>BREACH</strong>
            </article>
          </section>

          <section className="command-grid">
            <article className="threat-panel">
              <div>
                <h2>THREAT INDEX</h2>
                <strong>{cityThreatLevel}%</strong>
              </div>

              <div className="threat-meter">
                <div style={{ width: `${cityThreatLevel}%` }} />
              </div>

              <p>Calculated from active mission risk, Arkham breach state and escaped target count.</p>
            </article>

            <article className="priority-panel">
              <h2>PRIORITY OPERATION</h2>
              <strong>{criticalMission.title}</strong>
              <span>{criticalMission.district} / ETA {criticalMission.eta}</span>
              <p>{criticalMission.description}</p>
            </article>

            <article className="feed-panel">
              <h2>INCIDENT FEED</h2>

              <ul>
                {incidentFeed.map((incident) => (
                  <li key={incident}>{incident}</li>
                ))}
              </ul>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}

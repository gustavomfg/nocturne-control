import { useEffect, useState } from "react";

import { InterfaceIcon } from "../components/InterfaceIcon";
import { useNocturne } from "../state/useNocturne";
import type { Page } from "../types";

import "../styles/dashboard.css";

type DashboardProps = {
  onNavigate?: (page: Page) => void;
  onOpenVillain?: (name: string) => void;
};

export function Dashboard({ onNavigate, onOpenVillain }: DashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { operatorName, villains, gadgets, missions, logs } = useNocturne();

  const escapedVillains = villains.filter(
    (villain) => villain.status === "ESCAPED"
  ).length;

  const activeMissions = missions.filter(
    (mission) => mission.status === "ACTIVE"
  ).length;

  const availableGadgets = gadgets.filter(
    (gadget) => gadget.status === "AVAILABLE"
  ).length;

  const cityThreatLevel = Math.min(
    100,
    Math.round(missions.reduce((total, mission) => total + mission.riskLevel, 0) / missions.length + escapedVillains * 8)
  );

  const criticalMission = missions.reduce((highestRisk, mission) =>
    mission.riskLevel > highestRisk.riskLevel ? mission : highestRisk
  );

  const mostWanted = villains.find((villain) => villain.status === "ESCAPED");
  const targetConfidence = mostWanted?.dangerLevel === "EXTREME" ? 87 : 64;
  const targetInitials = mostWanted?.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const incidentFeed = logs.length > 1
    ? logs.slice(0, 4).map((log) => `${log.timestamp} / ${log.message}`)
    : [
        "Gravemere perimeter camera lost signal for 12 seconds.",
        `${criticalMission.assignedUnit} reports movement near ${criticalMission.district}.`,
        "Rain interference elevated across rooftop relay network.",
        mostWanted ? `${mostWanted.name} profile flagged near ${mostWanted.lastLocation}.` : "No escaped target currently locked.",
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
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  function interactivePage(page: Page) {
    return {
      role: "button",
      tabIndex: 0,
      onClick: () => onNavigate?.(page),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onNavigate?.(page);
        }
      },
    };
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Nocturne Live Monitor</h1>
          <p>{greeting}, {operatorName || "operator"}. Real-time tactical overview from the Sentinel console.</p>
        </div>

        <strong>{formattedTime}</strong>
      </header>

      <section className="dashboard-content">
        <article className="radar-panel">
          <div className="radar-frame">
            <div className="radar-label">CITYWATCH / AEGIS GRID</div>

            <div className="radar">
              <div className="radar-map" />
              <div className="radar-pulse pulse-one" />
              <div className="radar-pulse pulse-two" />
              <div className="radar-sweep" />
              <div className="radar-noise" />
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
          <p>Low-visibility scan across central Nocturne and Gravemere perimeter.</p>
        </article>

        <div className="dashboard-mainframe">
          <nav className="quick-actions" aria-label="Quick operational actions">
            <button onClick={() => onNavigate?.("missions")}>Open priority operation <span>→</span></button>
            <button onClick={() => mostWanted && onOpenVillain?.(mostWanted.name)} disabled={!mostWanted}>Track priority target <span>→</span></button>
            <button onClick={() => onNavigate?.("aegis")}>Deploy Aegis asset <span>→</span></button>
          </nav>
          <section className="status-grid">
            <article {...interactivePage("dashboard")}>
              <h2>CITY STATUS</h2>
              <strong>DANGER</strong>
            </article>

            <article {...interactivePage("map")}>
              <h2>NIGHT SIGNAL</h2>
              <strong>ONLINE</strong>
            </article>

            <article {...interactivePage("gravemere")}>
              <h2>ESCAPED VILLAINS</h2>
              <strong>{escapedVillains}</strong>
            </article>

            <article {...interactivePage("missions")}>
              <h2>ACTIVE MISSIONS</h2>
              <strong>{activeMissions}</strong>
            </article>

            <article {...interactivePage("aegis")}>
              <h2>AVAILABLE GADGETS</h2>
              <strong>{availableGadgets}</strong>
            </article>

            <article {...interactivePage("map")}>
              <h2>GRAVEMERE STATUS</h2>
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
              <svg className="threat-sparkline" viewBox="0 0 320 54" role="img" aria-label="Threat activity trend">
                <polyline points={`0,46 48,38 92,42 136,24 180,31 226,14 270,22 320,${Math.max(5, 54 - cityThreatLevel / 2)}`} />
              </svg>

              <p>Calculated from active mission risk, Gravemere breach state and escaped target count.</p>
            </article>

            <article className="priority-panel actionable-panel" onClick={() => onNavigate?.("missions")}>
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

            <article className="priority-target-panel actionable-panel" onClick={() => mostWanted && onOpenVillain?.(mostWanted.name)}>
              <h2>PRIORITY TARGET</h2>

              {mostWanted ? (
                <>
                  <div className="target-file">
                    <div className="target-sigil" aria-hidden="true">
                      <InterfaceIcon name="target" />
                      <span>{targetInitials}</span>
                    </div>

                    <div>
                      <strong>{mostWanted.name}</strong>
                      <span>{mostWanted.status} / {mostWanted.dangerLevel}</span>
                      <p>{mostWanted.lastLocation}</p>
                    </div>
                  </div>

                  <div className="target-confidence">
                    <div>
                      <span>TRACKING CONFIDENCE</span>
                      <strong>{targetConfidence}%</strong>
                    </div>

                    <div className="target-confidence-bar">
                      <div style={{ width: `${targetConfidence}%` }} />
                    </div>
                  </div>

                  <p>{mostWanted.threatNotes}</p>
                </>
              ) : (
                <p>No escaped target currently locked.</p>
              )}
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}

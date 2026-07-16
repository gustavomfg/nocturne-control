import { useEffect, useState } from "react";

import { InterfaceIcon } from "../components/InterfaceIcon.tsx";
import { useNocturne } from "../state/useNocturne.ts";
import type { Page } from "../types";

import "../styles/dashboard.css";

type DashboardProps = {
  onNavigate?: (page: Page) => void;
  onOpenVillain?: (name: string) => void;
};

export function Dashboard({ onNavigate, onOpenVillain }: DashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { operatorName, villains, gadgets, missions, logs } = useNocturne();
  const openMissions = missions.filter((mission) => mission.status !== "COMPLETED");
  const openMissionCount = openMissions.length;

  const escapedVillains = villains.filter(
    (villain) => villain.status === "ESCAPED"
  ).length;
  const escapedTargets = villains.filter((villain) => villain.status === "ESCAPED");

  const activeMissions = missions.filter(
    (mission) => mission.status === "ACTIVE"
  ).length;

  const availableGadgets = gadgets.filter(
    (gadget) => gadget.status === "AVAILABLE"
  ).length;
  const deployedGadgets = gadgets.filter(
    (gadget) => gadget.status === "DEPLOYED"
  ).length;
  const gravemereMissions = missions.filter(
    (mission) =>
      mission.district.toLowerCase().includes("gravemere") &&
      mission.status !== "COMPLETED"
  );
  const criticalMissions = missions.filter(
    (mission) =>
      mission.status !== "COMPLETED" &&
      (mission.priority === "CRITICAL" || mission.riskLevel >= 80)
  );

  const averageMissionRisk = openMissionCount
    ? openMissions.reduce((total, mission) => total + mission.riskLevel, 0) / openMissionCount
    : 0;
  const cityThreatLevel = Math.min(
    100,
    Math.round(averageMissionRisk + escapedVillains * 8)
  );

  const criticalMission = openMissions.length
    ? openMissions.reduce((highestRisk, mission) =>
        mission.riskLevel > highestRisk.riskLevel ? mission : highestRisk
      )
    : null;

  const dangerWeights = { LOW: 42, MEDIUM: 58, HIGH: 72, EXTREME: 87 } as const;
  const mostWanted = escapedTargets.length
    ? escapedTargets.reduce((highestRisk, villain) =>
        dangerWeights[villain.dangerLevel] > dangerWeights[highestRisk.dangerLevel]
          ? villain
          : highestRisk
      )
    : null;
  const targetConfidence = mostWanted
    ? Math.min(96, dangerWeights[mostWanted.dangerLevel] + (logs.length > 3 ? 4 : 0))
    : 0;
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
        criticalMission
          ? `${criticalMission.assignedUnit} reports movement near ${criticalMission.district}.`
          : "No active mission telemetry in queue.",
        "Rain interference elevated across rooftop relay network.",
        mostWanted
          ? `${mostWanted.name} profile flagged near ${mostWanted.lastLocation}.`
          : "No escaped target file is available.",
      ];
  const cityStatus = cityThreatLevel >= 75
    ? "DANGER"
    : cityThreatLevel >= 45
      ? "ELEVATED"
      : cityThreatLevel > 0
        ? "WATCH"
        : "STABLE";
  const cityStatusReason = `Missions: ${activeMissions} active / Targets: ${escapedVillains} escaped`;
  const averageMissionRiskLabel = `${Math.round(averageMissionRisk)}%`;
  const gravemereStatus =
    gravemereMissions.some((mission) => mission.riskLevel >= 80) || escapedVillains > 0
      ? "BREACH"
      : gravemereMissions.length > 0
        ? "WATCH"
        : "SEALED";
  const gravemereReason = gravemereMissions.length
    ? `Gravemere missions: ${gravemereMissions.length} active`
    : "No active Gravemere mission";
  const nightSignal = logs.length > 3
    ? "ACTIVE"
    : deployedGadgets > 0
      ? "RELAY"
      : "ONLINE";
  const contactCount = Math.max(escapedVillains + criticalMissions.length, mostWanted ? 1 : 0);
  const contactLabel = `${contactCount} contact${contactCount === 1 ? "" : "s"}`;
  const priorityMissionLabel = criticalMission ? criticalMission.title : "Mission queue clear";
  const priorityTargetLabel = mostWanted ? mostWanted.name : "No escaped target";
  const logEntryLabel = `Logs: ${logs.length} ${logs.length === 1 ? "entry" : "entries"}`;

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
  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Nocturne Live Monitor</h1>
          <p>{greeting}, {operatorName || "operator"}. Tactical state across missions, targets, Aegis assets and city logs.</p>
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
              <span>{criticalMission ? criticalMission.district.toUpperCase() : "CITYWIDE"}</span>
              <span>RAIN INTERFERENCE</span>
              <span>{contactLabel.toUpperCase()}</span>
            </div>
          </div>

          <h2>City Surveillance</h2>
          <p>{contactCount > 0 ? `${contactLabel} from escaped targets and high-risk missions.` : "No priority contacts currently plotted."}</p>
        </article>

        <div className="dashboard-mainframe">
          <nav className="quick-actions" aria-label="Dashboard shortcuts">
            <button onClick={() => onNavigate?.("missions")}>
              <span>Mission queue</span>
              <strong>{criticalMission ? "Review" : "Clear"}</strong>
            </button>
            <button onClick={() => mostWanted && onOpenVillain?.(mostWanted.name)} disabled={!mostWanted}>
              <span>Priority target</span>
              <strong>{mostWanted ? "Open file" : "Contained"}</strong>
            </button>
            <button onClick={() => onNavigate?.("aegis")}>
              <span>Aegis inventory</span>
              <strong>{availableGadgets} ready</strong>
            </button>
          </nav>

          <section className="command-grid">
            <button
              className="priority-panel actionable-panel panel-button"
              type="button"
              onClick={() => onNavigate?.("missions")}
              aria-label={`${priorityMissionLabel}. ${criticalMission?.description ?? "No open mission requires escalation."}`}
            >
              <h2>PRIORITY MISSION</h2>
              <strong>{criticalMission?.title ?? "Mission queue clear"}</strong>
              <span>{criticalMission ? `${criticalMission.district} / ETA ${criticalMission.eta}` : "No open mission requires escalation"}</span>
              <p>{criticalMission?.description ?? "Stand by for the next Nocturne signal."}</p>
            </button>

            <article className="threat-panel">
              <div>
                <h2>THREAT INDEX</h2>
                <strong>{cityThreatLevel}%</strong>
              </div>

              <div className="threat-meter">
                <div style={{ width: `${cityThreatLevel}%` }} />
              </div>

              <div className="threat-breakdown" aria-label="Threat index breakdown">
                <span>
                  <small>Mission risk</small>
                  <strong>{averageMissionRiskLabel}</strong>
                </span>
                <span>
                  <small>Escaped targets</small>
                  <strong>{escapedVillains}</strong>
                </span>
                <span>
                  <small>Critical ops</small>
                  <strong>{criticalMissions.length}</strong>
                </span>
                <span>
                  <small>City state</small>
                  <strong>{cityStatus}</strong>
                </span>
              </div>

              <p>Average mission risk plus escaped target pressure. Higher values need mission review.</p>
            </article>

            <button
              className="priority-target-panel actionable-panel panel-button"
              type="button"
              onClick={() => mostWanted && onOpenVillain?.(mostWanted.name)}
              disabled={!mostWanted}
              aria-label={mostWanted ? `Open target file: ${priorityTargetLabel}. Tracking confidence ${targetConfidence}%.` : "No escaped target file is available."}
            >
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
                <p>No escaped target file is available.</p>
              )}
            </button>

            <article className="feed-panel">
              <h2>INCIDENT FEED</h2>

              <ul>
                {incidentFeed.map((incident) => (
                  <li key={incident}>{incident}</li>
                ))}
              </ul>
            </article>
          </section>

          <section className="status-grid">
            <button type="button" onClick={() => onNavigate?.("logs")} aria-label={`City status ${cityStatus}. ${cityStatusReason}. Open logs.`}>
              <h2>CITY STATUS</h2>
              <strong>{cityStatus}</strong>
              <span>{cityStatusReason}</span>
            </button>

            <button type="button" onClick={() => onNavigate?.("map")} aria-label={`Map signal ${nightSignal}. Open map.`}>
              <h2>MAP SIGNAL</h2>
              <strong>{nightSignal}</strong>
              <span>{logEntryLabel}</span>
            </button>

            <button type="button" onClick={() => onNavigate?.("gravemere")} aria-label={`${escapedVillains} escaped villains. Open Gravemere archive.`}>
              <h2>ESCAPED VILLAINS</h2>
              <strong>{escapedVillains}</strong>
              <span>{mostWanted ? `Priority: ${mostWanted.name}` : "All targets contained"}</span>
            </button>

            <button type="button" onClick={() => onNavigate?.("missions")} aria-label={`${activeMissions} active missions. Open missions.`}>
              <h2>ACTIVE MISSIONS</h2>
              <strong>{activeMissions}</strong>
              <span>High-risk missions: {criticalMissions.length}</span>
            </button>

            <button type="button" onClick={() => onNavigate?.("aegis")} aria-label={`${availableGadgets} available gadgets. Open Aegis Lab.`}>
              <h2>AVAILABLE GADGETS</h2>
              <strong>{availableGadgets}</strong>
              <span>{deployedGadgets} deployed</span>
            </button>

            <button type="button" onClick={() => onNavigate?.("map")} aria-label={`Gravemere status ${gravemereStatus}. ${gravemereReason}. Open map.`}>
              <h2>GRAVEMERE STATUS</h2>
              <strong>{gravemereStatus}</strong>
              <span>{gravemereReason}</span>
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}

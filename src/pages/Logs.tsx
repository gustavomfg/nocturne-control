import { useRef, useState } from "react";
import { useNocturne } from "../state/useNocturne.ts";
import type { EventLog } from "../types";

import "../styles/logs.css";

export function Logs() {
  const state = useNocturne();
  const { logs, importState } = state;
  const [filter, setFilter] = useState<EventLog["type"] | "ALL">("ALL");
  const [importMessage, setImportMessage] = useState("");
  const fileInput = useRef<HTMLInputElement | null>(null);
  const visibleLogs = filter === "ALL" ? logs : logs.filter((log) => log.type === filter);

  function exportState() {
    const serializableState = {
      schemaVersion: state.schemaVersion,
      operatorName: state.operatorName,
      villains: state.villains,
      missions: state.missions,
      gadgets: state.gadgets,
      logs: state.logs,
      campaign: state.campaign,
      missionPlans: state.missionPlans,
      achievements: state.achievements,
    };
    const blob = new Blob([JSON.stringify(serializableState, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "nocturne-control-save.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setImportMessage("Save rejected: files must be smaller than 1 MB.");
      return;
    }
    try {
      const value: unknown = JSON.parse(await file.text());
      setImportMessage(importState(value) ? "Save restored successfully." : "Invalid or incompatible save.");
    } catch {
      setImportMessage("The selected file is not valid JSON.");
    }
  }

  return (
    <main className="logs-page">
      <header className="logs-header">
        <div>
          <h1>Event Timeline</h1>
          <p>Operational history from the current Nocturne Control session.</p>
        </div>

        <div className="logs-actions">
          <strong>{logs.length} EVENTS</strong>
          <button onClick={exportState}>Export save</button>
          <button onClick={() => fileInput.current?.click()}>Import save</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => void handleImport(event.target.files?.[0])} />
        </div>
      </header>

      <div className="logs-filters" aria-label="Filter event timeline">
        {(["ALL", "SYSTEM", "OPERATOR", "MISSION", "PLAN", "CAMPAIGN", "ACHIEVEMENT", "DEPLOY", "CAPTURE"] as const).map((type) => (
          <button key={type} aria-pressed={filter === type} onClick={() => setFilter(type)}>{type}</button>
        ))}
      </div>
      {importMessage && <p className="import-message" role="status">{importMessage}</p>}

      <section className="logs-timeline" aria-live="polite">
        {visibleLogs.map((log) => (
          <article key={log.id} className={`log-entry ${log.type.toLowerCase()}`}>
            <span>{log.timestamp}</span>
            <strong>{log.type}</strong>
            <p>{log.message}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

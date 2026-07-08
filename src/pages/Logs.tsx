import { useNocturne } from "../state/useNocturne";

import "../styles/logs.css";

export function Logs() {
  const { logs } = useNocturne();

  function exportLogs() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "nocturne-control-logs.json";
    link.click();
    URL.revokeObjectURL(url);
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
          <button onClick={exportLogs}>Export JSON</button>
        </div>
      </header>

      <section className="logs-timeline">
        {logs.map((log) => (
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

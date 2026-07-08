import "../styles/not-found.css";

type NotFoundProps = {
  onGoHome: () => void;
};

export function NotFound({ onGoHome }: NotFoundProps) {
  return (
    <main className="not-found-page">
      <section>
        <span>404 / AEGIS ROUTE FAILURE</span>
        <h1>Signal Lost</h1>
        <p>The requested Nocturne Control route is not indexed in the Sentinel console.</p>

        <button onClick={onGoHome}>Return to Dashboard</button>
      </section>
    </main>
  );
}

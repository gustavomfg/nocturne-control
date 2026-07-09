export function RouteSkeleton() {
  return (
    <main className="route-skeleton" aria-busy="true" aria-label="Loading secure module">
      <div className="skeleton-line wide" />
      <div className="skeleton-line" />
      <section>
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </section>
    </main>
  );
}

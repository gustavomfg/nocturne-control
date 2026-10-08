import { Suspense, useEffect, useRef, useState } from "react";
import { experiments, findExperiment } from "../experiments/registry";
import { fadeTo } from "../core/transitions";
import { hashForSlug, slugFromHash } from "./routing";
import "./shell.css";

function readSlug() {
  return slugFromHash(window.location.hash);
}

export default function App() {
  const [requested, setRequested] = useState(readSlug);
  const active = findExperiment(requested) ?? experiments[0];
  // The experiment on screen lags the URL by a curtain fade, so switching feels deliberate.
  const [shown, setShown] = useState(active.slug);
  const curtain = useRef<HTMLDivElement>(null);
  const Current = (findExperiment(shown) ?? experiments[0]).component;

  useEffect(() => {
    const onHashChange = () => setRequested(readSlug());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (shown === active.slug) return;
    let cancelled = false;
    const element = curtain.current;
    void (async () => {
      if (element) await fadeTo(element, 1, 0.5);
      if (cancelled) return;
      setShown(active.slug);
      if (element) await fadeTo(element, 0, 0.7);
    })();
    return () => {
      cancelled = true;
    };
  }, [active.slug, shown]);

  return (
    <div className="ovra-shell">
      <a className="skip-link" href="#experiment">Ir para o experimento</a>
      <header className="ovra-header">
        <span className="ovra-wordmark">OVRA</span>
        <nav className="ovra-index" aria-label="Experimentos">
          {experiments.map((experiment) => (
            <a
              key={experiment.slug}
              href={hashForSlug(experiment.slug)}
              title={experiment.title}
              aria-label={`${experiment.title}, experimento ${experiment.code}`}
              aria-current={experiment.slug === shown ? "page" : undefined}
            >
              {experiment.code}
            </a>
          ))}
        </nav>
      </header>
      <main id="experiment" className="ovra-stage">
        <Suspense fallback={<div className="ovra-loading" aria-hidden="true" />}>
          <Current key={shown} />
        </Suspense>
      </main>
      <div ref={curtain} className="ovra-curtain" aria-hidden="true" />
    </div>
  );
}

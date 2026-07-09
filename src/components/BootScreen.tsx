import { useEffect, useMemo, useState } from "react";

import "../styles/boot.css";

type BootScreenProps = {
  operatorName: string;
  onConfirmName: (name: string) => void;
  onComplete: () => void;
};

export function BootScreen({ operatorName, onConfirmName, onComplete }: BootScreenProps) {
  const [name, setName] = useState(operatorName);
  const [isBooting, setIsBooting] = useState(Boolean(operatorName));
  const [currentMessage, setCurrentMessage] = useState(0);
  const bootMessages = useMemo(() => [
    "Initializing Nocturne Control Center...",
    "Checking Aegis modules...",
    "Loading Gravemere archive...",
    "Activating Night Signal...",
    "Access granted.",
    `Olá, ${name.trim() || operatorName}. Sentinel aguarda seu comando.`,
  ], [name, operatorName]);

  useEffect(() => {
    if (!isBooting) {
      return;
    }

    if (currentMessage >= bootMessages.length - 1) {
      const timeout = window.setTimeout(onComplete, 900);
      return () => window.clearTimeout(timeout);
    }

    const timeout = window.setTimeout(() => {
      setCurrentMessage((message) => message + 1);
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [bootMessages.length, currentMessage, isBooting, onComplete]);

  function startBoot() {
    const cleanName = name.trim().replace(/\s+/g, " ").slice(0, 32);

    if (!cleanName) {
      return;
    }

    setName(cleanName);
    onConfirmName(cleanName);
    setCurrentMessage(0);
    setIsBooting(true);
  }

  return (
    <main className="boot">
      <section className="boot-card" aria-labelledby="boot-title">
        <span className="boot-eyebrow">AEGIS IDENTITY PROTOCOL</span>
        <h1 id="boot-title">NOCTURNE SYSTEM</h1>

        {!isBooting ? (
          <form className="boot-identity" onSubmit={(event) => {
            event.preventDefault();
            startBoot();
          }}>
            <label htmlFor="operator-name">Identify yourself, operator</label>
            <p>Your name will be stored only in this browser.</p>
            <div>
              <span>&gt;</span>
              <input
                id="operator-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                maxLength={32}
                autoComplete="nickname"
                autoFocus
              />
            </div>
            <button type="submit" disabled={!name.trim()}>Initialize system</button>
          </form>
        ) : (
          <>
            <div className="boot-terminal" aria-live="polite" aria-atomic="false">
              {bootMessages.slice(0, currentMessage + 1).map((message) => (
                <p key={message}>
                  <span className="boot-prefix">&gt;</span> {message}
                </p>
              ))}
              <span className="boot-cursor">_</span>
            </div>
            <div className="boot-progress" role="progressbar" aria-label="System initialization" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((currentMessage + 1) / bootMessages.length) * 100)}>
              <div style={{ width: `${((currentMessage + 1) / bootMessages.length) * 100}%` }} />
            </div>
            <div className="boot-actions">
              <button type="button" onClick={() => {
                setIsBooting(false);
                setCurrentMessage(0);
              }}>Change operator</button>
              <button className="boot-skip" type="button" onClick={onComplete}>Skip initialization</button>
            </div>
          </>
        )}

        <small>Aegis Security Protocol v2.0 / Local encrypted channel</small>
      </section>
    </main>
  );
}

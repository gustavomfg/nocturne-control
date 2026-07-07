import { useEffect, useState } from "react";

import "../styles/boot.css";

const bootMessages = [
  "Initializing Gotham Control Center...",
  "Checking WayneTech Modules...",
  "Loading Arkham Database...",
  "Activating Bat Signal...",
  "Access Granted.",
  "Welcome, Bruce Wayne.",
];

export function BootScreen() {
  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    if (currentMessage >= bootMessages.length - 1) {
      return;
    }

    const timeout = setTimeout(() => {
      setCurrentMessage((prevMessage) => prevMessage + 1);
    }, 1200);

    return () => clearTimeout(timeout);
  }, [currentMessage]);

  return (
    <main className="boot">
      <div className="boot-card">
        <h1>GOTHAM SYSTEM</h1>

        <div className="boot-terminal">
          {bootMessages.slice(0, currentMessage + 1).map((message) => (
            <p key={message}>
              <span className="boot-prefix">&gt;</span> {message}
            </p>
          ))}

          <span className="boot-cursor">_</span>
        </div>

        <small>WayneTech Security Protocol v1.0</small>
      </div>
    </main>
  );
}
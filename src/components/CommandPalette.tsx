import { useEffect, useMemo, useRef, useState } from "react";

import type { Page } from "../types";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
  onToggleEffects: () => void;
  onToggleSound: () => void;
  onToggleContrast: () => void;
};

const navigationCommands: Array<{ label: string; detail: string; page: Page }> = [
  { label: "Open Dashboard", detail: "Live tactical overview", page: "dashboard" },
  { label: "Open Gravemere", detail: "Target archive", page: "gravemere" },
  { label: "Open Missions", detail: "Operations and objectives", page: "missions" },
  { label: "Open Aegis Lab", detail: "Equipment and deployments", page: "aegis" },
  { label: "Open Terminal", detail: "Sentinel command console", page: "terminal" },
  { label: "Open Map", detail: "District surveillance", page: "map" },
  { label: "Open Profile", detail: "Operator identity", page: "profile" },
  { label: "Open Logs", detail: "Operational timeline", page: "logs" },
];

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onToggleEffects,
  onToggleSound,
  onToggleContrast,
}: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => navigationCommands.filter((command) =>
    `${command.label} ${command.detail}`.toLowerCase().includes(query.toLowerCase())
  ), [query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery("");
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="command-palette" onCancel={onClose} onClose={onClose}>
      <header>
        <span>⌘</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search modules and commands..."
          aria-label="Search commands"
          autoFocus
        />
        <kbd>ESC</kbd>
      </header>
      <div className="command-results">
        <small>NAVIGATION</small>
        {filtered.map((command) => (
          <button key={command.page} type="button" onClick={() => {
            onNavigate(command.page);
            onClose();
          }}>
            <span><strong>{command.label}</strong><small>{command.detail}</small></span>
            <kbd>↵</kbd>
          </button>
        ))}
        {filtered.length === 0 && <p>No indexed command matches “{query}”.</p>}
        {!query && (
          <>
            <small>PREFERENCES</small>
            <button type="button" onClick={onToggleEffects}><span><strong>Toggle visual effects</strong><small>Motion and atmospheric overlays</small></span></button>
            <button type="button" onClick={onToggleSound}><span><strong>Toggle interface sound</strong><small>Terminal and navigation tones</small></span></button>
            <button type="button" onClick={onToggleContrast}><span><strong>Toggle high contrast</strong><small>Sharper text and interface borders</small></span></button>
          </>
        )}
      </div>
      <footer><span>↑↓ Navigate</span><span>Enter Select</span><span>Ctrl K Open</span></footer>
    </dialog>
  );
}

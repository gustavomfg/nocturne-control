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
  { label: "Open Night Watch", detail: "Campaign and operational replay", page: "campaign" },
  { label: "Open Scenario Editor", detail: "Create local mission scenarios", page: "editor" },
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
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => navigationCommands.filter((command) =>
    `${command.label} ${command.detail}`.toLowerCase().includes(query.toLowerCase())
  ), [query]);
  const results = useMemo(() => {
    const preferences = [
      { label: "Toggle visual effects", detail: "Motion and atmospheric overlays", action: onToggleEffects },
      { label: "Toggle interface sound", detail: "Terminal and navigation tones", action: onToggleSound },
      { label: "Toggle high contrast", detail: "Sharper text and interface borders", action: onToggleContrast },
    ];
    return [...filtered.map((command) => ({ ...command, action: () => onNavigate(command.page) })), ...preferences]
      .filter((command) => `${command.label} ${command.detail}`.toLowerCase().includes(query.toLowerCase()));
  }, [filtered, onNavigate, onToggleContrast, onToggleEffects, onToggleSound, query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery("");
      setActiveIndex(0);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="command-palette" onCancel={onClose} onClose={onClose} onKeyDown={(event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(results.length - 1, index + 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
      if (event.key === "Enter" && event.target === dialogRef.current) { event.preventDefault(); results[activeIndex]?.action(); onClose(); }
    }}>
      <header>
        <span>⌘</span>
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(results.length - 1, index + 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
            if (event.key === "Enter") { event.preventDefault(); results[activeIndex]?.action(); onClose(); }
          }}
          placeholder="Search modules and commands..."
          aria-label="Search commands"
          autoFocus
        />
        <kbd>ESC</kbd>
      </header>
      <div className="command-results">
        <small>COMMANDS</small>
        {results.map((command, index) => (
          <button key={command.label} className={index === activeIndex ? "active" : ""} type="button" onMouseMove={() => setActiveIndex(index)} onClick={() => {
            command.action();
            onClose();
          }}>
            <span><strong>{command.label}</strong><small>{command.detail}</small></span>
            <kbd>↵</kbd>
          </button>
        ))}
        {results.length === 0 && <p>No indexed command matches “{query}”.</p>}
      </div>
      <footer><span>↑↓ Navigate</span><span>Enter Select</span><span>Ctrl K Open</span></footer>
    </dialog>
  );
}

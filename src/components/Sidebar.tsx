import { useState } from "react";
import type { Page } from "../types";
import { InterfaceIcon } from "./InterfaceIcon";
import { useNocturne } from "../state/useNocturne";
import { playTone } from "../utils/audio";
import { notify } from "../utils/uiEvents";
import { ConfirmDialog } from "./ConfirmDialog";
import "../styles/sidebar.css";

type SidebarProps = {
  activePage: Page;
  onChangePage: (page: Page) => void;
  effectsEnabled: boolean;
  onToggleEffects: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenPalette: () => void;
  highContrast: boolean;
  onToggleContrast: () => void;
};

const navItems: Array<{ page: Page; label: string; icon: Parameters<typeof InterfaceIcon>[0]["name"] }> = [
  { page: "dashboard", label: "Dashboard", icon: "dashboard" },
  { page: "gravemere", label: "Gravemere", icon: "target" },
  { page: "missions", label: "Missions", icon: "mission" },
  { page: "aegis", label: "Aegis Lab", icon: "shield" },
  { page: "terminal", label: "Terminal", icon: "terminal" },
  { page: "map", label: "Map", icon: "map" },
  { page: "campaign", label: "Night Watch", icon: "radar" },
  { page: "profile", label: "Profile", icon: "profile" },
  { page: "editor", label: "Scenario Editor", icon: "editor" },
  { page: "logs", label: "Logs", icon: "archive" },
];

export function Sidebar({
  activePage,
  onChangePage,
  effectsEnabled,
  onToggleEffects,
  soundEnabled,
  onToggleSound,
  onOpenPalette,
  highContrast,
  onToggleContrast,
}: SidebarProps) {
  const { operatorName, resetState } = useNocturne();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  function changePage(page: Page) {
    playTone("click", soundEnabled);
    onChangePage(page);
    setMobileOpen(false);
  }

  return (
    <>
    <button className="mobile-menu-toggle" type="button" aria-expanded={mobileOpen} aria-controls="primary-sidebar" onClick={() => setMobileOpen((open) => !open)}>
      <span aria-hidden="true">☰</span> Menu
    </button>
    <aside id="primary-sidebar" className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <h2>NOCTURNE CONTROL</h2>
      <p className="operator-chip">OPERATOR / {operatorName || "UNIDENTIFIED"}</p>

      <nav>
        {navItems.map((item) => (
          <button
            key={item.page}
            className={activePage === item.page ? "active" : ""}
            onClick={() => changePage(item.page)}
            aria-current={activePage === item.page ? "page" : undefined}
            title={item.label}
          >
            <InterfaceIcon name={item.icon} />
            <span>{item.label}</span>
            <small>{item.page === activePage ? "ACTIVE" : ""}</small>
          </button>
        ))}
      </nav>

      <button className="palette-trigger" onClick={onOpenPalette}>
        <InterfaceIcon name="crosshair" />
        <span>Quick Search</span>
        <kbd>Ctrl K</kbd>
      </button>

      <button className="effects-toggle" onClick={onToggleEffects} aria-pressed={effectsEnabled}>
        <InterfaceIcon name="activity" />
        <span>Effects {effectsEnabled ? "On" : "Off"}</span>
      </button>

      <button className="effects-toggle" onClick={onToggleSound} aria-pressed={soundEnabled}>
        <InterfaceIcon name="sound" />
        <span>Sound {soundEnabled ? "On" : "Off"}</span>
      </button>

      <button className="effects-toggle" onClick={onToggleContrast} aria-pressed={highContrast}>
        <InterfaceIcon name="activity" />
        <span>Contrast {highContrast ? "High" : "Standard"}</span>
      </button>

      <button
        className="effects-toggle danger-toggle"
        onClick={() => setConfirmReset(true)}
      >
        <InterfaceIcon name="reset" />
        <span>Reset State</span>
      </button>

      <p className="fan-disclaimer">Original fictional tactical interface for portfolio and study.</p>

      <small>SYSTEM ONLINE</small>
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <ConfirmDialog
      open={confirmReset}
      title="Reset operational state?"
      message="All mission progress, target statuses, gadget power and logs will return to baseline. Your operator identity is preserved."
      confirmLabel="Reset operation"
      onClose={() => setConfirmReset(false)}
      onConfirm={() => {
        resetState();
        playTone("alert", soundEnabled);
        notify({ title: "Operation reset", message: "Baseline Nocturne files restored.", tone: "warning" });
      }}
    />
    </>
  );
}

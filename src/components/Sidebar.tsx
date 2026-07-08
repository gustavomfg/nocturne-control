import type { Page } from "../types";
import { InterfaceIcon } from "./InterfaceIcon";
import { useNocturne } from "../state/useNocturne";
import { playTone } from "../utils/audio";
import "../styles/sidebar.css";

type SidebarProps = {
  activePage: Page;
  onChangePage: (page: Page) => void;
  effectsEnabled: boolean;
  onToggleEffects: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
};

const navItems: Array<{ page: Page; label: string; icon: Parameters<typeof InterfaceIcon>[0]["name"] }> = [
  { page: "dashboard", label: "Dashboard", icon: "dashboard" },
  { page: "gravemere", label: "Gravemere", icon: "target" },
  { page: "missions", label: "Missions", icon: "mission" },
  { page: "aegis", label: "Aegis Lab", icon: "shield" },
  { page: "terminal", label: "Terminal", icon: "terminal" },
  { page: "map", label: "Map", icon: "map" },
  { page: "profile", label: "Profile", icon: "profile" },
  { page: "logs", label: "Logs", icon: "archive" },
];

export function Sidebar({
  activePage,
  onChangePage,
  effectsEnabled,
  onToggleEffects,
  soundEnabled,
  onToggleSound,
}: SidebarProps) {
  const { resetState } = useNocturne();

  function changePage(page: Page) {
    playTone("click", soundEnabled);
    onChangePage(page);
  }

  return (
    <aside className="sidebar">
      <h2>NOCTURNE CONTROL</h2>

      <nav>
        {navItems.map((item) => (
          <button
            key={item.page}
            className={activePage === item.page ? "active" : ""}
            onClick={() => changePage(item.page)}
            aria-current={activePage === item.page ? "page" : undefined}
          >
            <InterfaceIcon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button className="effects-toggle" onClick={onToggleEffects} aria-pressed={effectsEnabled}>
        <InterfaceIcon name="activity" />
        <span>Effects {effectsEnabled ? "On" : "Off"}</span>
      </button>

      <button className="effects-toggle" onClick={onToggleSound} aria-pressed={soundEnabled}>
        <InterfaceIcon name="sound" />
        <span>Sound {soundEnabled ? "On" : "Off"}</span>
      </button>

      <button
        className="effects-toggle danger-toggle"
        onClick={() => {
          resetState();
          playTone("alert", soundEnabled);
        }}
      >
        <InterfaceIcon name="reset" />
        <span>Reset State</span>
      </button>

      <p className="fan-disclaimer">Original fictional tactical interface for portfolio and study.</p>

      <small>SYSTEM ONLINE</small>
    </aside>
  );
}

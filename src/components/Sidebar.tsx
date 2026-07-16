import { useEffect, useRef, useState } from "react";
import type { Page } from "../types";
import { moduleCatalog } from "../modules.ts";
import { InterfaceIcon } from "./InterfaceIcon.tsx";
import { useNocturne } from "../state/useNocturne.ts";
import { playTone } from "../utils/audio.ts";
import { notify } from "../utils/uiEvents.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
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
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

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
  mobileOpen,
  onMobileOpenChange,
}: SidebarProps) {
  const { operatorName, resetState, missions, gadgets, logs } = useNocturne();
  const [confirmReset, setConfirmReset] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const badges: Partial<Record<Page, number>> = {
    missions: missions.filter((mission) => mission.status !== "COMPLETED" && mission.riskLevel >= 70).length,
    aegis: gadgets.filter((gadget) => gadget.status === "MAINTENANCE").length,
    logs: logs.filter((log) => log.type === "ACHIEVEMENT").length,
  };

  useEffect(() => {
    if (!mobileOpen) return;

    const mobileQuery = window.matchMedia("(max-width: 820px)");
    if (!mobileQuery.matches) {
      onMobileOpenChange(false);
      return;
    }

    const sidebar = sidebarRef.current;
    const menuButton = menuButtonRef.current;
    const getSidebarControls = () => Array.from(sidebar?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    ) ?? []);
    const animationFrame = window.requestAnimationFrame(() => getSidebarControls()[0]?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onMobileOpenChange(false);
        return;
      }

      if (event.key !== "Tab") return;
      const controls = menuButton ? [menuButton, ...getSidebarControls()] : getSidebarControls();
      if (controls.length === 0) return;
      const currentIndex = controls.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? controls.length - 1 : currentIndex - 1)
        : (currentIndex === controls.length - 1 ? 0 : currentIndex + 1);

      event.preventDefault();
      controls[nextIndex].focus();
    }

    function handleViewportChange(event: MediaQueryListEvent) {
      if (!event.matches) onMobileOpenChange(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    mobileQuery.addEventListener("change", handleViewportChange);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("keydown", handleKeyDown);
      mobileQuery.removeEventListener("change", handleViewportChange);
      if (mobileQuery.matches) window.requestAnimationFrame(() => menuButton?.focus());
    };
  }, [mobileOpen, onMobileOpenChange]);

  function changePage(page: Page) {
    playTone("click", soundEnabled);
    onChangePage(page);
    onMobileOpenChange(false);
  }

  return (
    <>
    <button ref={menuButtonRef} className="mobile-menu-toggle" type="button" aria-expanded={mobileOpen} aria-controls="primary-sidebar" onClick={() => onMobileOpenChange(!mobileOpen)}>
      <span aria-hidden="true">☰</span> Menu
    </button>
    <aside
      ref={sidebarRef}
      id="primary-sidebar"
      className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}
      role={mobileOpen ? "dialog" : undefined}
      aria-modal={mobileOpen || undefined}
      aria-labelledby="sidebar-title"
    >
      <h2 id="sidebar-title">NOCTURNE CONTROL</h2>
      <p className="operator-chip">OPERATOR / {operatorName || "UNIDENTIFIED"}</p>

      <nav>
        {moduleCatalog.map((item) => (
          <button
            key={item.page}
            className={activePage === item.page ? "active" : ""}
            onClick={() => changePage(item.page)}
            aria-current={activePage === item.page ? "page" : undefined}
            title={item.label}
          >
            <InterfaceIcon name={item.icon} />
            <span>{item.label}</span>
            <small>{item.page === activePage ? "ACTIVE" : badges[item.page] ? <b aria-label={`${badges[item.page]} alerts`}>{badges[item.page]}</b> : ""}</small>
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
        onClick={() => {
          onMobileOpenChange(false);
          setConfirmReset(true);
        }}
      >
        <InterfaceIcon name="reset" />
        <span>Reset State</span>
      </button>

      <p className="fan-disclaimer">Original fictional tactical interface for portfolio and study.</p>

      <small>SYSTEM ONLINE</small>
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => onMobileOpenChange(false)} />}
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

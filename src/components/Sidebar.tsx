import type { Page } from "../types";
import "../styles/sidebar.css";

type SidebarProps = {
  activePage: Page;
  onChangePage: (page: Page) => void;
};

export function Sidebar({ activePage, onChangePage }: SidebarProps) {
  return (
    <aside className="sidebar">
      <h2>GOTHAM CONTROL</h2>

      <nav>
        <button
          className={activePage === "dashboard" ? "active" : ""}
          onClick={() => onChangePage("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={activePage === "arkham" ? "active" : ""}
          onClick={() => onChangePage("arkham")}
        >
          Arkham
        </button>

        <button
          className={activePage === "missions" ? "active" : ""}
          onClick={() => onChangePage("missions")}
        >
          Missions
        </button>

        <button
          className={activePage === "waynetech" ? "active" : ""}
          onClick={() => onChangePage("waynetech")}
        >
          WayneTech
        </button>

        <button
          className={activePage === "terminal" ? "active" : ""}
          onClick={() => onChangePage("terminal")}
        >
          Terminal
        </button>
      </nav>

      <small>SYSTEM ONLINE</small>
    </aside>
  );
}

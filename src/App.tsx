import { useEffect, useState } from "react";

import { BootScreen } from "./components/BootScreen";
import { Sidebar } from "./components/Sidebar";

import { Dashboard } from "./pages/Dashboard";
import { Arkham } from "./pages/Arkham";
import { Missions } from "./pages/Missions";
import { Terminal } from "./pages/Terminal";
import { WayneTech } from "./pages/WayneTech";
import { GothamEffects } from "./components/GothamEffects";

import type { Page } from "./types";

const pageRoutes: Record<Page, string> = {
  dashboard: "/dashboard",
  arkham: "/arkham",
  missions: "/missions",
  waynetech: "/waynetech",
  terminal: "/terminal",
};

function getPageFromPath(pathname: string): Page {
  const route = Object.entries(pageRoutes).find(([, path]) => path === pathname);

  return route ? route[0] as Page : "dashboard";
}

function App() {
  const [boot, setBoot] = useState(true);
  const [activePage, setActivePage] = useState<Page>(() => getPageFromPath(window.location.pathname));

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState(null, "", pageRoutes.dashboard);
    }

    function handlePopState() {
      setActivePage(getPageFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function handleChangePage(page: Page) {
    setActivePage(page);
    window.history.pushState(null, "", pageRoutes[page]);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setBoot(false);
    }, 7500);

    return () => clearTimeout(timer);
  }, []);

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;

      case "arkham":
        return <Arkham />;

      case "missions":
        return <Missions />;

      case "waynetech":
        return <WayneTech />;

      case "terminal":
        return <Terminal />;

      default:
        return <Dashboard />;
    }
  }

  if (boot) {
    return <BootScreen />;
  }

  return (
    <>
      <GothamEffects />

      <div className="app-layout">
        <Sidebar
          activePage={activePage}
          onChangePage={handleChangePage}
        />

        <div key={activePage} className="page-transition">
          {renderPage()}
        </div>
      </div>
    </>
  );

}

export default App;

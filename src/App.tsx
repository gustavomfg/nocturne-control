import { useEffect, useState } from "react";

import { BootScreen } from "./components/BootScreen";
import { Sidebar } from "./components/Sidebar";

import { Dashboard } from "./pages/Dashboard";
import { Gravemere } from "./pages/Gravemere";
import { Missions } from "./pages/Missions";
import { Terminal } from "./pages/Terminal";
import { AegisArsenal } from "./pages/AegisArsenal";
import { Logs } from "./pages/Logs";
import { VillainDetail } from "./pages/VillainDetail";
import { NocturneMap } from "./pages/NocturneMap";
import { Profile } from "./pages/Profile";
import { NotFound } from "./pages/NotFound";
import { NocturneEffects } from "./components/NocturneEffects";
import { slugify } from "./utils/slug";

import type { Page } from "./types";

const pageRoutes: Record<Page, string> = {
  dashboard: "/dashboard",
  gravemere: "/gravemere",
  missions: "/missions",
  aegis: "/aegis",
  terminal: "/terminal",
  logs: "/logs",
  map: "/map",
  profile: "/profile",
};

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const basePathFull = import.meta.env.BASE_URL;

function toAppPath(path: string) {
  return `${basePath}${path}` || path;
}

function getRelativePath(pathname: string) {
  if (basePath && pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length) || "/";
  }

  return pathname;
}

type AppRoute = {
  page: Page | "notFound";
  villainSlug?: string;
};

function getRouteFromPath(pathname: string): AppRoute {
  const relativePath = getRelativePath(pathname);

  if (relativePath.startsWith("/gravemere/") && relativePath.length > "/gravemere/".length) {
    return {
      page: "gravemere",
      villainSlug: relativePath.replace("/gravemere/", ""),
    };
  }

  if (relativePath === "/") {
    return { page: "dashboard" };
  }

  const route = Object.entries(pageRoutes).find(([, path]) => path === relativePath);

  return {
    page: route ? route[0] as Page : "notFound",
  };
}

function loadStoredBoolean(key: string, fallback: boolean) {
  let storedValue: string | null;

  try {
    storedValue = localStorage.getItem(key);
  } catch {
    return fallback;
  }

  if (storedValue === null) {
    return fallback;
  }

  return storedValue === "true";
}

function storeBoolean(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

function App() {
  const [boot, setBoot] = useState(true);
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromPath(window.location.pathname));
  const [effectsEnabled, setEffectsEnabled] = useState(() =>
    loadStoredBoolean("nocturne-effects-enabled", !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  );
  const [soundEnabled, setSoundEnabled] = useState(() => loadStoredBoolean("nocturne-sound-enabled", true));
  const activePage = route.page;

  useEffect(() => {
    if (window.location.pathname === basePathFull || window.location.pathname === basePathFull.replace(/\/$/, "")) {
      window.history.replaceState(null, "", toAppPath(pageRoutes.dashboard));
    }

    function handlePopState() {
      setRoute(getRouteFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    storeBoolean("nocturne-effects-enabled", effectsEnabled);
  }, [effectsEnabled]);

  useEffect(() => {
    storeBoolean("nocturne-sound-enabled", soundEnabled);
  }, [soundEnabled]);

  function handleChangePage(page: Page) {
    setRoute({ page });
    window.history.pushState(null, "", toAppPath(pageRoutes[page]));
  }

  function handleOpenVillain(villainName: string) {
    const villainSlug = slugify(villainName);

    setRoute({ page: "gravemere", villainSlug });
    window.history.pushState(null, "", toAppPath(`/gravemere/${villainSlug}`));
  }

  function handleBackToGravemere() {
    setRoute({ page: "gravemere" });
    window.history.pushState(null, "", toAppPath(pageRoutes.gravemere));
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setBoot(false);
    }, 7500);

    return () => clearTimeout(timer);
  }, []);

  function renderPage() {
    if (route.villainSlug) {
      return <VillainDetail slug={route.villainSlug} onBack={handleBackToGravemere} />;
    }

    switch (activePage) {
      case "dashboard":
        return <Dashboard />;

      case "gravemere":
        return <Gravemere onOpenVillain={handleOpenVillain} />;

      case "missions":
        return <Missions />;

      case "aegis":
        return <AegisArsenal />;

      case "terminal":
        return <Terminal soundEnabled={soundEnabled} />;

      case "logs":
        return <Logs />;

      case "map":
        return <NocturneMap />;

      case "profile":
        return <Profile />;

      case "notFound":
        return <NotFound onGoHome={() => handleChangePage("dashboard")} />;

      default:
        return <Dashboard />;
    }
  }

  if (boot) {
    return <BootScreen />;
  }

  return (
    <>
      <NocturneEffects enabled={effectsEnabled} />

      <div className="app-layout">
        <Sidebar
          activePage={activePage === "notFound" ? "dashboard" : activePage}
          onChangePage={handleChangePage}
          effectsEnabled={effectsEnabled}
          onToggleEffects={() => setEffectsEnabled((currentValue) => !currentValue)}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((currentValue) => !currentValue)}
        />

        <div key={`${activePage}-${route.villainSlug ?? "index"}`} className="page-transition">
          {renderPage()}
        </div>
      </div>
    </>
  );

}

export default App;

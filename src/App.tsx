import { useEffect, useState } from "react";

import { BootScreen } from "./components/BootScreen";
import { Sidebar } from "./components/Sidebar";

import { Dashboard } from "./pages/Dashboard";
import { Arkham } from "./pages/Arkham";
import { Missions } from "./pages/Missions";
import { Terminal } from "./pages/Terminal";
import { WayneTech } from "./pages/WayneTech";
import { Logs } from "./pages/Logs";
import { VillainDetail } from "./pages/VillainDetail";
import { GothamMap } from "./pages/GothamMap";
import { Profile } from "./pages/Profile";
import { NotFound } from "./pages/NotFound";
import { GothamEffects } from "./components/GothamEffects";
import { slugify } from "./utils/slug";

import type { Page } from "./types";

const pageRoutes: Record<Page, string> = {
  dashboard: "/dashboard",
  arkham: "/arkham",
  missions: "/missions",
  waynetech: "/waynetech",
  terminal: "/terminal",
  logs: "/logs",
  map: "/map",
  profile: "/profile",
};

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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

  if (relativePath.startsWith("/arkham/") && relativePath.length > "/arkham/".length) {
    return {
      page: "arkham",
      villainSlug: relativePath.replace("/arkham/", ""),
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
  const storedValue = localStorage.getItem(key);

  if (storedValue === null) {
    return fallback;
  }

  return storedValue === "true";
}

function App() {
  const [boot, setBoot] = useState(true);
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromPath(window.location.pathname));
  const [effectsEnabled, setEffectsEnabled] = useState(() =>
    loadStoredBoolean("gotham-effects-enabled", !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  );
  const [soundEnabled, setSoundEnabled] = useState(() => loadStoredBoolean("gotham-sound-enabled", true));
  const activePage = route.page;

  const basePathFull = import.meta.env.BASE_URL;

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
    localStorage.setItem("gotham-effects-enabled", String(effectsEnabled));
  }, [effectsEnabled]);

  useEffect(() => {
    localStorage.setItem("gotham-sound-enabled", String(soundEnabled));
  }, [soundEnabled]);

  function handleChangePage(page: Page) {
    setRoute({ page });
    window.history.pushState(null, "", toAppPath(pageRoutes[page]));
  }

  function handleOpenVillain(villainName: string) {
    const villainSlug = slugify(villainName);

    setRoute({ page: "arkham", villainSlug });
    window.history.pushState(null, "", toAppPath(`/arkham/${villainSlug}`));
  }

  function handleBackToArkham() {
    setRoute({ page: "arkham" });
    window.history.pushState(null, "", toAppPath(pageRoutes.arkham));
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setBoot(false);
    }, 7500);

    return () => clearTimeout(timer);
  }, []);

  function renderPage() {
    if (route.villainSlug) {
      return <VillainDetail slug={route.villainSlug} onBack={handleBackToArkham} />;
    }

    switch (activePage) {
      case "dashboard":
        return <Dashboard />;

      case "arkham":
        return <Arkham onOpenVillain={handleOpenVillain} />;

      case "missions":
        return <Missions />;

      case "waynetech":
        return <WayneTech />;

      case "terminal":
        return <Terminal soundEnabled={soundEnabled} />;

      case "logs":
        return <Logs />;

      case "map":
        return <GothamMap />;

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
      <GothamEffects enabled={effectsEnabled} />

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

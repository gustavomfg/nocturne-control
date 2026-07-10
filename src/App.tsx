import { lazy, Suspense, useCallback, useEffect, useState } from "react";

import { BootScreen } from "./components/BootScreen";
import { Sidebar } from "./components/Sidebar";

import { NocturneEffects } from "./components/NocturneEffects";
import { RouteSkeleton } from "./components/RouteSkeleton";
import { ToastViewport } from "./components/ToastViewport";
import { CommandPalette } from "./components/CommandPalette";
import { slugify } from "./utils/slug";
import { useNocturne } from "./state/useNocturne";

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
  campaign: "/campaign",
  editor: "/editor",
};

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const basePathFull = import.meta.env.BASE_URL;
const Dashboard = lazy(() => import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const Gravemere = lazy(() => import("./pages/Gravemere").then((module) => ({ default: module.Gravemere })));
const Missions = lazy(() => import("./pages/Missions").then((module) => ({ default: module.Missions })));
const Terminal = lazy(() => import("./pages/Terminal").then((module) => ({ default: module.Terminal })));
const AegisArsenal = lazy(() => import("./pages/AegisArsenal").then((module) => ({ default: module.AegisArsenal })));
const Logs = lazy(() => import("./pages/Logs").then((module) => ({ default: module.Logs })));
const VillainDetail = lazy(() => import("./pages/VillainDetail").then((module) => ({ default: module.VillainDetail })));
const NocturneMap = lazy(() => import("./pages/NocturneMap").then((module) => ({ default: module.NocturneMap })));
const Profile = lazy(() => import("./pages/Profile").then((module) => ({ default: module.Profile })));
const Campaign = lazy(() => import("./pages/Campaign").then((module) => ({ default: module.Campaign })));
const ScenarioEditor = lazy(() => import("./pages/ScenarioEditor").then((module) => ({ default: module.ScenarioEditor })));
const NotFound = lazy(() => import("./pages/NotFound").then((module) => ({ default: module.NotFound })));

function toAppPath(path: string) {
  return `${basePath}${path}` || path;
}

function getRelativePath(pathname: string) {
  const cleanPath = pathname.split(/[?#]/, 1)[0];
  if (basePath && cleanPath.startsWith(basePath)) {
    return cleanPath.slice(basePath.length) || "/";
  }

  return cleanPath;
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

function getRouteFromLocation() {
  const redirectedPath = new URLSearchParams(window.location.search).get("p");
  return getRouteFromPath(redirectedPath || window.location.pathname);
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
  const { operatorName, setOperatorName } = useNocturne();
  const [boot, setBoot] = useState(() => {
    try {
      return !sessionStorage.getItem("nocturne-boot-complete");
    } catch {
      return true;
    }
  });
  const [route, setRoute] = useState<AppRoute>(getRouteFromLocation);
  const [effectsEnabled, setEffectsEnabled] = useState(() =>
    loadStoredBoolean("nocturne-effects-enabled", !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  );
  const [soundEnabled, setSoundEnabled] = useState(() => loadStoredBoolean("nocturne-sound-enabled", true));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(() => loadStoredBoolean("nocturne-high-contrast", false));
  const activePage = route.page;
  const finishBoot = useCallback(() => {
    try {
      sessionStorage.setItem("nocturne-boot-complete", "true");
    } catch {
      // Session storage is optional.
    }
    setBoot(false);
  }, []);

  useEffect(() => {
    const redirectedPath = new URLSearchParams(window.location.search).get("p");
    if (redirectedPath) {
      const restoredUrl = new URL(redirectedPath, window.location.origin);
      if (restoredUrl.origin === window.location.origin) {
        window.history.replaceState(null, "", `${restoredUrl.pathname}${restoredUrl.search}${window.location.hash}`);
      }
    }
    if (window.location.pathname === basePathFull || window.location.pathname === basePathFull.replace(/\/$/, "")) {
      window.history.replaceState(null, "", toAppPath(pageRoutes.dashboard));
    }

    function handlePopState() {
      setRoute(getRouteFromLocation());
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

  useEffect(() => {
    storeBoolean("nocturne-high-contrast", highContrast);
  }, [highContrast]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

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
    if (!boot) {
      window.requestAnimationFrame(() => {
        const heading = document.querySelector<HTMLElement>(".page-transition main h1");
        heading?.setAttribute("tabindex", "-1");
        heading?.focus();
      });
    }
  }, [activePage, boot, route.villainSlug]);

  function renderPage() {
    if (route.villainSlug) {
      return <VillainDetail slug={route.villainSlug} onBack={handleBackToGravemere} />;
    }

    switch (activePage) {
      case "dashboard":
        return <Dashboard onNavigate={handleChangePage} onOpenVillain={handleOpenVillain} />;

      case "gravemere":
        return <Gravemere onOpenVillain={handleOpenVillain} />;

      case "missions":
        return <Missions />;

      case "aegis":
        return <AegisArsenal />;

      case "terminal":
        return (
          <Terminal
            soundEnabled={soundEnabled}
            onNavigate={handleChangePage}
            onOpenVillain={handleOpenVillain}
          />
        );

      case "logs":
        return <Logs />;

      case "map":
        return <NocturneMap onOpenVillain={handleOpenVillain} onOpenMissions={() => handleChangePage("missions")} />;

      case "profile":
        return <Profile />;

      case "campaign":
        return <Campaign />;

      case "editor":
        return <ScenarioEditor />;

      case "notFound":
        return <NotFound onGoHome={() => handleChangePage("dashboard")} />;

      default:
        return <Dashboard onNavigate={handleChangePage} onOpenVillain={handleOpenVillain} />;
    }
  }

  if (boot) {
    return (
      <BootScreen
        operatorName={operatorName}
        onConfirmName={setOperatorName}
        onComplete={finishBoot}
      />
    );
  }

  return (
    <>
      <NocturneEffects enabled={effectsEnabled} />

      <div className={`app-layout ${highContrast ? "high-contrast" : ""}`}>
        <Sidebar
          activePage={activePage === "notFound" ? "dashboard" : activePage}
          onChangePage={handleChangePage}
          effectsEnabled={effectsEnabled}
          onToggleEffects={() => setEffectsEnabled((currentValue) => !currentValue)}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((currentValue) => !currentValue)}
          onOpenPalette={() => setPaletteOpen(true)}
          highContrast={highContrast}
          onToggleContrast={() => setHighContrast((value) => !value)}
        />

        <div key={`${activePage}-${route.villainSlug ?? "index"}`} className="page-transition">
          <Suspense fallback={<RouteSkeleton />}>
            {renderPage()}
          </Suspense>
        </div>
        <ToastViewport />
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onNavigate={handleChangePage}
          onToggleEffects={() => setEffectsEnabled((value) => !value)}
          onToggleSound={() => setSoundEnabled((value) => !value)}
          onToggleContrast={() => setHighContrast((value) => !value)}
        />
      </div>
    </>
  );

}

export default App;

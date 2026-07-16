export type ModuleIcon =
  | "archive"
  | "dashboard"
  | "editor"
  | "map"
  | "mission"
  | "profile"
  | "radar"
  | "shield"
  | "target"
  | "terminal";

type ModuleCatalogEntry = {
  page: string;
  path: `/${string}`;
  title: string;
  label: string;
  icon: ModuleIcon;
  description: string;
  aliases: readonly string[];
};

export const moduleCatalog = [
  { page: "dashboard", path: "/dashboard", title: "Dashboard", label: "Dashboard", icon: "dashboard", description: "Live tactical overview", aliases: ["dashboard", "home"] },
  { page: "gravemere", path: "/gravemere", title: "Gravemere Archive", label: "Gravemere", icon: "target", description: "Target archive", aliases: ["gravemere"] },
  { page: "missions", path: "/missions", title: "Missions", label: "Missions", icon: "mission", description: "Operations and objectives", aliases: ["missions"] },
  { page: "aegis", path: "/aegis", title: "Aegis Lab", label: "Aegis Lab", icon: "shield", description: "Equipment and deployments", aliases: ["aegis", "arsenal"] },
  { page: "terminal", path: "/terminal", title: "Sentinel Terminal", label: "Terminal", icon: "terminal", description: "Sentinel command console", aliases: ["terminal"] },
  { page: "map", path: "/map", title: "Nocturne Map", label: "Map", icon: "map", description: "District surveillance", aliases: ["map"] },
  { page: "campaign", path: "/campaign", title: "Night Watch", label: "Night Watch", icon: "radar", description: "Campaign and operational replay", aliases: ["campaign", "watch"] },
  { page: "profile", path: "/profile", title: "Operator Profile", label: "Profile", icon: "profile", description: "Operator identity", aliases: ["profile"] },
  { page: "editor", path: "/editor", title: "Scenario Editor", label: "Scenario Editor", icon: "editor", description: "Create local mission scenarios", aliases: ["editor"] },
  { page: "logs", path: "/logs", title: "Event Timeline", label: "Logs", icon: "archive", description: "Operational timeline", aliases: ["logs"] },
] as const satisfies readonly ModuleCatalogEntry[];

export type Page = typeof moduleCatalog[number]["page"];
export type AppModule = typeof moduleCatalog[number];

export const moduleByPage = Object.fromEntries(
  moduleCatalog.map((module) => [module.page, module])
) as Record<Page, AppModule>;

export const moduleByPath: ReadonlyMap<string, AppModule> = new Map(
  moduleCatalog.map((module) => [module.path, module] as const)
);

export const pageAliases = Object.fromEntries(
  moduleCatalog.flatMap((module) => module.aliases.map((alias) => [alias, module.page]))
) as Record<string, Page>;

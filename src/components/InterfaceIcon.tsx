import type { ReactElement, SVGProps } from "react";

type IconName =
  | "activity"
  | "archive"
  | "bell"
  | "crosshair"
  | "dashboard"
  | "map"
  | "mission"
  | "power"
  | "profile"
  | "radar"
  | "reset"
  | "shield"
  | "sound"
  | "terminal"
  | "target"
  | "editor";

type InterfaceIconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

const paths: Record<IconName, ReactElement> = {
  activity: (
    <>
      <path d="M4 12h4l2.4-6 3.2 12 2.4-6h4" />
      <path d="M18 4v3" />
      <path d="M18 17v3" />
    </>
  ),
  archive: (
    <>
      <path d="M4 7h16" />
      <path d="M5 7l1.2 13h11.6L19 7" />
      <path d="M8 4h8l1 3H7z" />
      <path d="M9 11h6" />
    </>
  ),
  bell: (
    <>
      <path d="M7 10a5 5 0 0 1 10 0c0 4 2 5 2 5H5s2-1 2-5" />
      <path d="M10 19a2 2 0 0 0 4 0" />
      <path d="M12 3v2" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  dashboard: (
    <>
      <path d="M4 13a8 8 0 1 1 16 0" />
      <path d="M12 13l4-4" />
      <path d="M5 17h14" />
      <path d="M8 17v2" />
      <path d="M16 17v2" />
    </>
  ),
  map: (
    <>
      <path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </>
  ),
  mission: (
    <>
      <path d="M7 4h10l3 5-8 11L4 9z" />
      <path d="M8 9h8" />
      <path d="M10 13h4" />
    </>
  ),
  power: (
    <>
      <path d="M12 3v8" />
      <path d="M7.8 6.2a7 7 0 1 0 8.4 0" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </>
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3.5v8.5l5.7 3.4" />
      <path d="M4 12H2M22 12h-2M12 4V2M12 22v-2" />
    </>
  ),
  reset: (
    <>
      <path d="M5 12a7 7 0 1 0 2.05-4.95L5 9" />
      <path d="M5 5v4h4" />
      <path d="M10 12h4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-2.8 8.2-7 10-4.2-1.8-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-5" />
    </>
  ),
  sound: (
    <>
      <path d="M4 10v4h4l5 4V6l-5 4z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
      <path d="M18.5 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  terminal: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M7 9l3 3-3 3" />
      <path d="M12 15h5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
    </>
  ),
  editor: (
    <>
      <path d="M5 4h10l4 4v12H5z" />
      <path d="M15 4v5h5" />
      <path d="M8 15l6-6 2 2-6 6H8z" />
    </>
  ),
};

export function InterfaceIcon({ name, className = "", ...props }: InterfaceIconProps) {
  return (
    <svg
      className={`interface-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

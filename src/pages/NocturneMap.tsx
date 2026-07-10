import { useMemo, useState } from "react";

import { LeafletNocturneMap } from "../components/LeafletNocturneMap";
import type { NocturneDistrictMap } from "../components/LeafletNocturneMap";
import { useNocturne } from "../state/useNocturne";
import { asset } from "../utils/assets";

import "../styles/nocturne-map.css";

type NocturneMapProps = {
  onOpenVillain?: (name: string) => void;
  onOpenMissions?: () => void;
};

const districts: NocturneDistrictMap[] = [
  {
    id: "gravemere",
    name: "Gravemere",
    aliases: ["gravemere", "chemical", "morrow"],
    center: [292, 292],
    pin: [286, 246],
    bounds: [[86, 72], [480, 508]],
  },
  {
    id: "old-nocturne",
    name: "Old Meridian",
    aliases: ["old meridian"],
    center: [690, 292],
    pin: [678, 352],
    bounds: [[84, 445], [498, 923]],
  },
  {
    id: "financial",
    name: "Financial",
    aliases: ["financial", "aegis spire", "aegis"],
    center: [1068, 304],
    pin: [1080, 235],
    bounds: [[82, 822], [530, 1314]],
  },
  {
    id: "east-end",
    name: "Cinder Row",
    aliases: ["cinder row"],
    center: [366, 682],
    pin: [346, 638],
    bounds: [[490, 73], [850, 678]],
  },
  {
    id: "harbor",
    name: "Harbor",
    aliases: ["harbor", "dock", "docks", "quay"],
    center: [950, 704],
    pin: [1008, 785],
    bounds: [[520, 596], [888, 1276]],
  },
];

function matchesDistrict(value: string, districtId: string) {
  const district = districts.find((item) => item.id === districtId);
  const normalizedValue = value.toLowerCase();

  return district?.aliases.some((alias) => normalizedValue.includes(alias)) ?? false;
}

function getDistrictForValue(value: string) {
  return districts.find((district) => matchesDistrict(value, district.id)) ?? districts[0];
}

export function NocturneMap({ onOpenVillain, onOpenMissions }: NocturneMapProps) {
  const { villains, missions } = useNocturne();
  const [activeDistrictId, setActiveDistrictId] = useState("gravemere");
  const [showMissions, setShowMissions] = useState(true);
  const [showTargets, setShowTargets] = useState(true);
  const [fitAllToken, setFitAllToken] = useState(0);
  const activeDistrict = districts.find((district) => district.id === activeDistrictId) ?? districts[0];

  const districtVillains = useMemo(
    () => villains.filter((villain) => matchesDistrict(villain.lastLocation, activeDistrict.id)),
    [activeDistrict.id, villains]
  );
  const districtMissions = useMemo(
    () => missions.filter((mission) => matchesDistrict(mission.district, activeDistrict.id)),
    [activeDistrict.id, missions]
  );
  const activeMissionPins = useMemo(
    () => missions.filter((mission) => mission.status === "ACTIVE"),
    [missions]
  );
  const escapedVillainPins = useMemo(
    () => villains.filter((villain) => villain.status === "ESCAPED"),
    [villains]
  );
  const districtRisk = districtMissions.length
    ? Math.round(districtMissions.reduce((total, mission) => total + mission.riskLevel, 0) / districtMissions.length)
    : 0;

  return (
    <main className="nocturne-map-page">
      <header className="map-header">
        <div>
          <h1>Nocturne Map</h1>
          <p>District-level surveillance for active cases and target sightings.</p>
        </div>

        <strong>{activeDistrict.name.toUpperCase()}</strong>
      </header>

      <section className="map-layout">
        <div className="map-panel">
          <div className="map-toolbar">
            <span>AEGIS CARTOGRAPHY / LEAFLET GRID</span>
            <div>
              <button aria-pressed={showMissions} onClick={() => setShowMissions((value) => !value)}>Missions</button>
              <button aria-pressed={showTargets} onClick={() => setShowTargets((value) => !value)}>Targets</button>
              <button onClick={() => setFitAllToken((value) => value + 1)}>Fit signals</button>
            </div>
          </div>

          <LeafletNocturneMap
            imageUrl={asset("/maps/nocturne-custom-map.svg")}
            districts={districts}
            activeDistrictId={activeDistrict.id}
            activeMissionPins={showMissions ? activeMissionPins : []}
            escapedVillainPins={showTargets ? escapedVillainPins : []}
            getDistrictForValue={getDistrictForValue}
            onSelectDistrict={setActiveDistrictId}
            onOpenVillain={onOpenVillain}
            onOpenMissions={onOpenMissions}
            fitAllToken={fitAllToken}
          />

          <div className="map-location-menu" aria-label="Nocturne landmark signals">
            <span>Locations</span>
            <button onClick={() => setActiveDistrictId("financial")}>Aegis Spire</button>
            <button onClick={() => setActiveDistrictId("gravemere")}>Gravemere Archive</button>
            <button onClick={() => setActiveDistrictId("old-nocturne")}>City Hall</button>
            <button onClick={() => setActiveDistrictId("harbor")}>Nocturne Stadium</button>
          </div>

          <div className="map-legend">
            <span><i className="legend-mission" /> Active mission</span>
            <span><i className="legend-villain" /> Escaped target</span>
            <span><i className="legend-district" /> Selected district</span>
          </div>
          <section className="sr-only" aria-label="Map signal summary">
            <h2>Map signals</h2>
            <ul>
              {activeMissionPins.map((mission) => <li key={`mission-${mission.id}`}>Active mission: {mission.title}, {mission.district}, risk {mission.riskLevel}%.</li>)}
              {escapedVillainPins.map((villain) => <li key={`target-${villain.id}`}>Escaped target: {villain.name}, last signal {villain.lastLocation}.</li>)}
            </ul>
          </section>
        </div>

        <aside className="map-intel">
          <h2>District Intel</h2>

          <article className="district-risk-card">
            <span>Threat pressure</span>
            <strong>{districtRisk}%</strong>
            <div className="district-risk-meter" role="meter" aria-label={`${activeDistrict.name} threat pressure`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={districtRisk}><i style={{ width: `${districtRisk}%` }} /></div>
            <p>{districtRisk >= 70 ? "Critical operational pressure. Prepared assets recommended." : districtRisk >= 40 ? "Elevated signals require continued observation." : "Sector pressure remains within controlled limits."}</p>
          </article>

          <article>
            <span>Targets</span>
            <strong>{districtVillains.length || "NONE"}</strong>
            <p>{districtVillains.map((villain) => villain.name).join(" / ") || "No villain signal in this sector."}</p>
            {districtVillains[0] && <button onClick={() => onOpenVillain?.(districtVillains[0].name)}>Open target file</button>}
          </article>

          <article>
            <span>Missions</span>
            <strong>{districtMissions.length || "NONE"}</strong>
            <p>{districtMissions.map((mission) => mission.title).join(" / ") || "No active mission assigned to this district."}</p>
            {districtMissions[0] && <button onClick={onOpenMissions}>Open mission control</button>}
          </article>

          <article>
            <span>Terrain</span>
            <strong>{activeDistrict.name === "Harbor" ? "LOW" : "DENSE"}</strong>
            <p>Rain interference and rooftop density are factored into current scan reliability.</p>
          </article>
        </aside>
      </section>
    </main>
  );
}

import { useState } from "react";
import type { FormEvent } from "react";

import { useNocturne } from "../state/useNocturne.ts";
import type { Mission, MissionPriority } from "../types/mission.ts";
import { InterfaceIcon } from "../components/InterfaceIcon.tsx";
import "../styles/campaign.css";

const priorities: MissionPriority[] = ["LOW", "NORMAL", "HIGH", "CRITICAL"];

export function ScenarioEditor() {
  const { missions, addMission } = useNocturne();
  const [title, setTitle] = useState("");
  const [district, setDistrict] = useState("Gravemere District");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<MissionPriority>("NORMAL");
  const [message, setMessage] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const mission: Mission = {
      id: Math.max(0, ...missions.map((item) => item.id)) + 1,
      title: title.trim(), district: district.trim(), description: description.trim(), priority,
      status: "WAITING", progress: 0, assignedUnit: "Unassigned field unit", eta: "UNSCHEDULED", riskLevel: 50,
      villainIds: [], recommendedGadgetIds: [],
    };
    if (!mission.title || !mission.district || !mission.description) {
      setMessage("Title, district and scenario brief are required.");
      return;
    }
    const accepted = addMission(mission);
    setMessage(accepted ? "Scenario mission indexed and available in Mission Control." : "A mission with this identifier already exists.");
    if (accepted) { setTitle(""); setDescription(""); }
  }

  return <main className="campaign-page scenario-editor">
    <header className="campaign-header"><div><span className="section-kicker"><InterfaceIcon name="editor" /> DEVELOPMENT MODULE</span><h1>Scenario Editor</h1><p>Create original local missions for development and portfolio demonstrations.</p></div></header>
    <form className="campaign-panel" onSubmit={submit}>
      <label>Mission title<span className="editor-input"><InterfaceIcon name="mission" /><input value={title} maxLength={72} onChange={(event) => setTitle(event.target.value)} /></span></label>
      <label>District<span className="editor-input"><InterfaceIcon name="map" /><input value={district} maxLength={72} onChange={(event) => setDistrict(event.target.value)} /></span></label>
      <label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as MissionPriority)}>{priorities.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Scenario brief<textarea value={description} maxLength={320} onChange={(event) => setDescription(event.target.value)} /></label>
      <button className="editor-submit" type="submit"><InterfaceIcon name="editor" />Index scenario mission</button>
      {message && <p role="status">{message}</p>}
    </form>
  </main>;
}

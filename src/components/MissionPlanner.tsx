import { useEffect, useMemo, useRef, useState } from "react";

import type { MissionStrategy } from "../types";
import type { Gadget } from "../types/gadget";
import type { Mission } from "../types/mission";
import { InterfaceIcon } from "./InterfaceIcon";

import "../styles/campaign.css";

type MissionPlannerProps = {
  mission: Mission | null;
  gadgets: Gadget[];
  onClose: () => void;
  onSubmit: (missionId: number, strategy: MissionStrategy, gadgetIds: number[], unit: string) => void;
};

export function MissionPlanner({ mission, gadgets, onClose, onSubmit }: MissionPlannerProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [strategy, setStrategy] = useState<MissionStrategy>("SURVEILLANCE");
  const [unit, setUnit] = useState("");
  const [gadgetIds, setGadgetIds] = useState<number[]>([]);
  const availableGadgets = useMemo(() => gadgets.filter((gadget) => gadget.status !== "MAINTENANCE"), [gadgets]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (mission && !dialog.open) {
      setStrategy("SURVEILLANCE");
      setUnit(mission.assignedUnit);
      setGadgetIds(mission.recommendedGadgetIds.filter((id) => gadgets.some((gadget) => gadget.id === id && gadget.status !== "MAINTENANCE")));
      dialog.showModal();
    }
    if (!mission && dialog.open) dialog.close();
  }, [gadgets, mission]);

  return (
    <dialog ref={dialogRef} className="nocturne-dialog mission-planner" onCancel={onClose} onClose={onClose}>
      <span>OPERATION PLANNING</span>
      <h2>{mission?.title ?? "Mission plan"}</h2>
      <p>Assign a field unit, a protocol and assets before advancing the next watch.</p>
      <label className="planner-field">
        Field unit
        <span className="planner-input"><InterfaceIcon name="profile" /><input value={unit} maxLength={48} onChange={(event) => setUnit(event.target.value)} /></span>
      </label>
      <fieldset className="planner-protocols">
        <legend>Protocol</legend>
        {([
          ["SURVEILLANCE", "radar", "Build intelligence safely"],
          ["STEALTH", "target", "Controlled infiltration"],
          ["DIRECT", "activity", "Immediate field pressure"],
        ] as const).map(([value, icon, detail]) => (
          <button key={value} type="button" className={strategy === value ? "selected" : ""} aria-pressed={strategy === value} onClick={() => setStrategy(value)}>
            <InterfaceIcon name={icon} /><span><strong>{value}</strong><small>{detail}</small></span>
          </button>
        ))}
      </fieldset>
      <fieldset className="planner-assets">
        <legend>Deployable assets</legend>
        {availableGadgets.map((gadget) => (
          <label key={gadget.id} className={gadgetIds.includes(gadget.id) ? "selected" : ""}>
            <input
              type="checkbox"
              checked={gadgetIds.includes(gadget.id)}
              onChange={() => setGadgetIds((current) => current.includes(gadget.id)
                ? current.filter((id) => id !== gadget.id)
                : [...current, gadget.id])}
            />
            <span><strong>{gadget.name}</strong><small>POWER {gadget.powerLevel}%</small></span>
          </label>
        ))}
      </fieldset>
      <div>
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="button" className="danger" disabled={!mission || !unit.trim()} onClick={() => {
          if (mission) onSubmit(mission.id, strategy, gadgetIds, unit);
          onClose();
        }}>Commit plan</button>
      </div>
    </dialog>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";

import type { MissionStrategy } from "../types";
import type { Gadget } from "../types/gadget.ts";
import type { Mission } from "../types/mission.ts";
import { InterfaceIcon } from "./InterfaceIcon.tsx";
import { evaluateMissionPlan } from "../domain/missionPlanning.ts";

import "../styles/campaign.css";

type MissionPlannerProps = {
  mission: Mission | null;
  gadgets: Gadget[];
  reservedGadgetIds?: number[];
  onClose: () => void;
  onSubmit: (missionId: number, strategy: MissionStrategy, gadgetIds: number[], unit: string) => void;
};

export function MissionPlanner({ mission, gadgets, reservedGadgetIds = [], onClose, onSubmit }: MissionPlannerProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [strategy, setStrategy] = useState<MissionStrategy>("SURVEILLANCE");
  const [unit, setUnit] = useState("");
  const [gadgetIds, setGadgetIds] = useState<number[]>([]);
  const availableGadgets = useMemo(() => gadgets.filter((gadget) => gadget.status !== "MAINTENANCE"), [gadgets]);
  const effectiveGadgetIds = useMemo(
    () => gadgetIds.filter((id) => !reservedGadgetIds.includes(id)),
    [gadgetIds, reservedGadgetIds]
  );
  const forecast = useMemo(() => mission ? evaluateMissionPlan(mission, strategy, effectiveGadgetIds, gadgets) : null, [effectiveGadgetIds, gadgets, mission, strategy]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (mission && !dialog.open) {
      setStrategy("SURVEILLANCE");
      setUnit(mission.assignedUnit);
      setGadgetIds(mission.recommendedGadgetIds.filter((id) =>
        !reservedGadgetIds.includes(id) && gadgets.some((gadget) => gadget.id === id && gadget.status !== "MAINTENANCE")
      ));
      dialog.showModal();
    }
    if (!mission && dialog.open) dialog.close();
  }, [gadgets, mission, reservedGadgetIds]);

  return (
    <dialog ref={dialogRef} className="nocturne-dialog mission-planner" aria-labelledby="mission-planner-title" onCancel={onClose} onClose={onClose}>
      <span>OPERATION PLANNING</span>
      <h2 id="mission-planner-title">{mission?.title ?? "Mission plan"}</h2>
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
        {availableGadgets.map((gadget) => {
          const reserved = reservedGadgetIds.includes(gadget.id);
          return (
          <label key={gadget.id} className={effectiveGadgetIds.includes(gadget.id) ? "selected" : ""}>
            <input
              type="checkbox"
              checked={effectiveGadgetIds.includes(gadget.id)}
              disabled={reserved}
              onChange={() => setGadgetIds((current) => current.includes(gadget.id)
                ? current.filter((id) => id !== gadget.id)
                : [...current, gadget.id])}
            />
            <span><strong>{gadget.name}</strong><small>{reserved ? "ASSIGNED TO ANOTHER PLAN" : `POWER ${gadget.powerLevel}%`}</small></span>
          </label>
          );
        })}
      </fieldset>
      {forecast && <section className="planner-forecast" aria-live="polite" aria-label="Projected operation outcome">
        <header><span>Outcome forecast</span><strong>{forecast.label}</strong></header>
        <div>
          <p><span>Progress</span><strong>+{forecast.progressGain}%</strong><small>{mission?.progress}% → {forecast.projectedProgress}%</small></p>
          <p><span>Risk</span><strong className={forecast.riskDelta <= 0 ? "positive" : "negative"}>{forecast.riskDelta > 0 ? "+" : ""}{forecast.riskDelta}%</strong><small>{mission?.riskLevel}% → {forecast.projectedRisk}%</small></p>
          <p><span>Intel</span><strong>+{forecast.intelGain}</strong><small>{forecast.synergy} asset synergies</small></p>
          <p><span>Power</span><strong>-{forecast.powerCost}%</strong><small>Across selected assets</small></p>
        </div>
      </section>}
      <div>
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="button" className="danger" disabled={!mission || !unit.trim()} onClick={() => {
          if (mission) onSubmit(mission.id, strategy, effectiveGadgetIds, unit);
          onClose();
        }}>Commit plan</button>
      </div>
    </dialog>
  );
}

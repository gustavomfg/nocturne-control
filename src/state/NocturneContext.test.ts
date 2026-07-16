import { describe, expect, it } from "vitest";

import { evaluateMissionPlan } from "../domain/missionPlanning.ts";
import {
  createSaveState,
  initialState,
  migrateState,
  nocturneReducer,
  SCHEMA_VERSION,
} from "./NocturneContext.tsx";

describe("Nocturne state", () => {
  it("migrates a legacy save while preserving operational data", () => {
    const legacyState = {
      villains: initialState.villains,
      missions: initialState.missions,
      gadgets: initialState.gadgets,
      logs: initialState.logs,
    };
    const migrated = migrateState(legacyState);

    expect(migrated?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated?.operatorName).toBe("");
    expect(migrated?.missions).toHaveLength(initialState.missions.length);
  });

  it("normalizes and limits the operator name", () => {
    const state = nocturneReducer(initialState, {
      type: "SET_OPERATOR_NAME",
      name: "  Helena    Wayne  ",
      timestamp: "22:10:00",
    });

    expect(state.operatorName).toBe("Helena Wayne");
    expect(state.logs[0].type).toBe("OPERATOR");
  });

  it("capturing a related target lowers mission risk", () => {
    const state = nocturneReducer(initialState, {
      type: "CAPTURE_VILLAIN",
      villainId: 1,
      timestamp: "22:11:00",
    });

    expect(state.villains.find((villain) => villain.id === 1)?.status).toBe("CAPTURED");
    expect(state.missions.find((mission) => mission.id === 1)?.riskLevel).toBeLessThan(
      initialState.missions.find((mission) => mission.id === 1)?.riskLevel ?? 0
    );
  });

  it("deploying a gadget advances the highest-risk operation", () => {
    const state = nocturneReducer(initialState, {
      type: "DEPLOY_GADGET",
      gadgetId: 1,
      timestamp: "22:12:00",
    });

    expect(state.gadgets.find((gadget) => gadget.id === 1)?.powerLevel).toBe(78);
    expect(state.missions.find((mission) => mission.id === 1)?.progress).toBe(94);
  });

  it("keeps operator identity when operational data is reset", () => {
    const namedState = { ...initialState, operatorName: "Barbara" };
    const state = nocturneReducer(namedState, { type: "RESET_STATE" });

    expect(state.operatorName).toBe("Barbara");
    expect(state.logs[0].message).toContain("Barbara");
  });

  it("rejects incomplete save data instead of restoring a state that would break the interface", () => {
    const invalid = {
      ...initialState,
      villains: [{ id: 1, name: "Incomplete target" }],
    };

    expect(migrateState(invalid)).toBeNull();
  });

  it("records a mission plan and applies its advantage when the watch advances", () => {
    const planned = nocturneReducer(initialState, {
      type: "PLAN_MISSION",
      missionId: 1,
      strategy: "STEALTH",
      gadgetIds: [3],
      unit: "Night Watch",
      timestamp: "22:13:00",
    });
    const advanced = nocturneReducer(planned, { type: "ADVANCE_CAMPAIGN", timestamp: "22:14:00" });

    expect(planned.missionPlans).toHaveLength(1);
    expect(advanced.missions.find((mission) => mission.id === 1)?.progress).toBe(99);
    expect(advanced.missionPlans).toHaveLength(0);
    expect(advanced.campaign.turn).toBe(2);
    expect(advanced.watchReports[0].outcomes).toHaveLength(4);
  });

  it("rejects assigning the same gadget to simultaneous mission plans", () => {
    const firstPlan = nocturneReducer(initialState, {
      type: "PLAN_MISSION",
      missionId: 1,
      strategy: "STEALTH",
      gadgetIds: [3],
      unit: "Unit A",
      timestamp: "22:13:00",
    });
    const conflictingPlan = nocturneReducer(firstPlan, {
      type: "PLAN_MISSION",
      missionId: 2,
      strategy: "DIRECT",
      gadgetIds: [3],
      unit: "Unit B",
      timestamp: "22:14:00",
    });

    expect(conflictingPlan).toBe(firstPlan);
    expect(conflictingPlan.missionPlans).toEqual([expect.objectContaining({ missionId: 1, gadgetIds: [3] })]);
    expect(migrateState({
      ...initialState,
      missionPlans: [
        { missionId: 1, strategy: "STEALTH", gadgetIds: [3], unit: "Unit A", preparedAt: "22:13:00" },
        { missionId: 2, strategy: "DIRECT", gadgetIds: [3], unit: "Unit B", preparedAt: "22:14:00" },
      ],
    })).toBeNull();
  });

  it("keeps both the action and achievement entries in the timeline", () => {
    const state = nocturneReducer(initialState, { type: "CAPTURE_VILLAIN", villainId: 1, timestamp: "22:15:00" });

    expect(state.logs.slice(0, 2).map((log) => log.type)).toEqual(["CAPTURE", "ACHIEVEMENT"]);
  });

  it("rejects out-of-range and unknown imported domain values", () => {
    expect(migrateState({ ...initialState, missions: [{ ...initialState.missions[0], progress: 140 }] })).toBeNull();
    expect(migrateState({ ...initialState, gadgets: [{ ...initialState.gadgets[0], status: "BROKEN" }] })).toBeNull();
  });

  it("validates every imported record and its nested references", () => {
    const invalidStates = [
      { ...initialState, villains: [{ ...initialState.villains[0], knownAssociates: [42] }] },
      { ...initialState, missions: [{ ...initialState.missions[0], assignedUnit: null }] },
      { ...initialState, gadgets: [{ ...initialState.gadgets[0], description: 7 }] },
      { ...initialState, missionPlans: [{ missionId: 1, strategy: "STEALTH", gadgetIds: [999], unit: "Unit A", preparedAt: "22:00" }] },
      { ...initialState, achievements: [{ id: "unknown", title: "Unknown", description: "Invalid", unlockedAt: "22:00" }] },
      {
        ...initialState,
        watchReports: [{
          id: "1-1-test",
          timestamp: "22:00",
          night: 1,
          turn: 1,
          stabilityBefore: 50,
          stabilityAfter: 55,
          intelBefore: 20,
          intelAfter: 30,
          outcomes: [{
            missionId: 999,
            title: "Unknown mission",
            strategy: "UNPLANNED",
            progressBefore: 0,
            progressAfter: 4,
            riskBefore: 50,
            riskAfter: 57,
            completed: false,
          }],
          gadgetsDrained: [],
        }],
      },
    ];

    invalidStates.forEach((state) => expect(migrateState(state)).toBeNull());
  });

  it("applies distinct campaign consequences for direct and stealth protocols", () => {
    const direct = nocturneReducer(nocturneReducer(initialState, { type: "PLAN_MISSION", missionId: 2, strategy: "DIRECT", gadgetIds: [], unit: "Unit A", timestamp: "22:16:00" }), { type: "ADVANCE_CAMPAIGN", timestamp: "22:17:00" });
    const stealth = nocturneReducer(nocturneReducer(initialState, { type: "PLAN_MISSION", missionId: 2, strategy: "STEALTH", gadgetIds: [], unit: "Unit A", timestamp: "22:16:00" }), { type: "ADVANCE_CAMPAIGN", timestamp: "22:17:00" });

    expect(direct.missions[1].progress).toBeGreaterThan(stealth.missions[1].progress);
    expect(direct.missions[1].riskLevel).toBeGreaterThan(stealth.missions[1].riskLevel);
  });

  it("applies the same mission evaluation shown by the planner", () => {
    const mission = initialState.missions[0];
    const gadgets = initialState.gadgets.map((gadget) => gadget.id === 3 ? { ...gadget, powerLevel: 8 } : gadget);
    const state = { ...initialState, gadgets };
    const evaluation = evaluateMissionPlan(mission, "STEALTH", [3], gadgets);
    const planned = nocturneReducer(state, {
      type: "PLAN_MISSION",
      missionId: mission.id,
      strategy: "STEALTH",
      gadgetIds: [3],
      unit: "Night Watch",
      timestamp: "22:18:00",
    });
    const advanced = nocturneReducer(planned, { type: "ADVANCE_CAMPAIGN", timestamp: "22:19:00" });
    const outcome = advanced.watchReports[0].outcomes.find((item) => item.missionId === mission.id);

    expect(outcome?.progressAfter).toBe(evaluation.projectedProgress);
    expect(outcome?.riskAfter).toBe(evaluation.projectedRisk);
    expect(advanced.campaign.intel).toBe(initialState.campaign.intel + 4 + evaluation.intelGain);
    expect(advanced.watchReports[0].gadgetsDrained).toEqual(evaluation.gadgetPowerCosts);
    expect(advanced.gadgets.find((gadget) => gadget.id === 3)?.powerLevel).toBe(0);
    expect(advanced.missionPlans).toHaveLength(0);
    expect(advanced.logs[0].type).toBe("CAMPAIGN");
    expect(advanced.logs[0].message).toContain(`intelligence ${advanced.campaign.intel}%`);
  });

  it("preserves watch reports through a save round-trip", () => {
    const planned = nocturneReducer(initialState, {
      type: "PLAN_MISSION",
      missionId: 1,
      strategy: "SURVEILLANCE",
      gadgetIds: [3],
      unit: "Night Watch",
      timestamp: "22:20:00",
    });
    const advanced = nocturneReducer(planned, { type: "ADVANCE_CAMPAIGN", timestamp: "22:21:00" });
    const exported = JSON.parse(JSON.stringify(createSaveState(advanced)));
    const restored = migrateState(exported);

    expect(restored?.watchReports).toEqual(advanced.watchReports);
    expect(restored?.watchReports).toHaveLength(1);
  });
});

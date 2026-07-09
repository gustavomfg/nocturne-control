import { describe, expect, it } from "vitest";

import {
  initialState,
  migrateState,
  nocturneReducer,
  SCHEMA_VERSION,
} from "./NocturneContext";

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
    expect(advanced.missions.find((mission) => mission.id === 1)?.progress).toBe(96);
    expect(advanced.missionPlans).toHaveLength(0);
    expect(advanced.campaign.turn).toBe(2);
  });
});

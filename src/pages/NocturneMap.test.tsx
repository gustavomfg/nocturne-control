// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NocturneProvider, initialState } from "../state/NocturneContext.tsx";
import { NocturneMap } from "./NocturneMap.tsx";

vi.mock("../components/LeafletNocturneMap.tsx", () => ({
  LeafletNocturneMap: ({ activeMissionPins, escapedVillainPins }: {
    activeMissionPins: Array<{ id: number }>;
    escapedVillainPins: Array<{ id: number }>;
  }) => <div aria-label="Map test surface" data-missions={activeMissionPins.length} data-targets={escapedVillainPins.length} />,
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("NocturneMap", () => {
  it("keeps visual filters and the accessible signal summary synchronized", async () => {
    const user = userEvent.setup();
    render(<NocturneProvider><NocturneMap /></NocturneProvider>);
    const map = screen.getByLabelText("Map test surface");
    const summary = screen.getByLabelText("Map signal summary");

    expect(map.getAttribute("data-missions")).toBe("3");
    expect(map.getAttribute("data-targets")).toBe("2");
    expect(within(summary).getAllByText(/active mission:/i)).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "Missions" }));
    expect(map.getAttribute("data-missions")).toBe("0");
    expect(within(summary).getByText("Mission signals are hidden.")).toBeTruthy();
    expect(within(summary).queryByText(/active mission:/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Targets" }));
    expect(map.getAttribute("data-targets")).toBe("0");
    expect(within(summary).getByText("Target signals are hidden.")).toBeTruthy();
    expect(within(summary).queryByText(/escaped target:/i)).toBeNull();
  });

  it("reports visible layers that have no signals", () => {
    localStorage.setItem("nocturne-control-state", JSON.stringify({
      ...initialState,
      missions: initialState.missions.map((mission) => ({ ...mission, status: "COMPLETED", progress: 100, riskLevel: 0 })),
      villains: initialState.villains.map((villain) => ({ ...villain, status: "CAPTURED" })),
    }));
    render(<NocturneProvider><NocturneMap /></NocturneProvider>);
    const summary = screen.getByLabelText("Map signal summary");

    expect(within(summary).getByText("No active mission signals.")).toBeTruthy();
    expect(within(summary).getByText("No escaped target signals.")).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { gadgets } from "../data/gadgets.ts";
import { missions } from "../data/missions.ts";
import { MissionPlanner } from "./MissionPlanner.tsx";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open"); };
});

afterEach(cleanup);

describe("MissionPlanner", () => {
  it("opens as a dialog, commits the selected plan and handles cancel", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<MissionPlanner mission={missions[0]} gadgets={gadgets} onClose={onClose} onSubmit={onSubmit} />);

    const dialog = await screen.findByRole("dialog", { name: missions[0].title }) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    await user.click(screen.getByRole("button", { name: /direct.*immediate field pressure/i }));
    await user.click(screen.getByRole("button", { name: "Commit plan" }));

    expect(onSubmit).toHaveBeenCalledWith(missions[0].id, "DIRECT", [3], missions[0].assignedUnit);
    expect(onClose).toHaveBeenCalled();

    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

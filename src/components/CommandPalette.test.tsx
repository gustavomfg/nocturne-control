// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { Page } from "../types";
import { CommandPalette } from "./CommandPalette.tsx";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(cleanup);

describe("CommandPalette", () => {
  it("opens accessibly, executes a filtered command and closes on cancel", async () => {
    const onNavigate = vi.fn<(page: Page) => void>();
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return <>
        <button onClick={() => setOpen(true)}>Open palette</button>
        <CommandPalette
          open={open}
          onClose={() => setOpen(false)}
          onNavigate={onNavigate}
          onToggleEffects={vi.fn()}
          onToggleSound={vi.fn()}
          onToggleContrast={vi.fn()}
        />
      </>;
    }

    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open palette" }));
    const dialog = screen.getByRole("dialog", { name: "Command palette" }) as HTMLDialogElement;
    const search = screen.getByRole("combobox", { name: "Search commands" });

    await user.type(search, "open map");
    await user.keyboard("{Enter}");
    expect(onNavigate).toHaveBeenCalledWith("map");
    await waitFor(() => expect(dialog.open).toBe(false));

    await user.click(screen.getByRole("button", { name: "Open palette" }));
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    await waitFor(() => expect(dialog.open).toBe(false));
  });
});

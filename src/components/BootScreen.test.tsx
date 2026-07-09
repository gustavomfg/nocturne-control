// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BootScreen } from "./BootScreen";

afterEach(cleanup);

describe("BootScreen", () => {
  it("identifies the operator before initializing the system", async () => {
    const user = userEvent.setup();
    const onConfirmName = vi.fn();

    render(
      <BootScreen
        operatorName=""
        onConfirmName={onConfirmName}
        onComplete={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText(/identify yourself/i), "  Selina  ");
    await user.click(screen.getByRole("button", { name: /initialize system/i }));

    expect(onConfirmName).toHaveBeenCalledWith("Selina");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("17");
    expect(screen.getByRole("button", { name: /skip initialization/i })).toBeTruthy();
  });

  it("allows a returning operator to change identity", async () => {
    const user = userEvent.setup();

    render(
      <BootScreen
        operatorName="Orion"
        onConfirmName={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /change operator/i }));

    expect((screen.getByLabelText(/identify yourself/i) as HTMLInputElement).value).toBe("Orion");
  });
});

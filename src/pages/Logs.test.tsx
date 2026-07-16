// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { NocturneProvider, initialState } from "../state/NocturneContext.tsx";
import { Logs } from "./Logs.tsx";

function jsonFile(name: string, contents: string) {
  const file = new File([contents], name, { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => contents });
  return file;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Logs save import", () => {
  it("rejects malformed JSON and restores a valid save", async () => {
    const user = userEvent.setup();
    const { container } = render(<NocturneProvider><Logs /></NocturneProvider>);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("Save file input was not rendered.");

    await user.upload(input, jsonFile("broken.json", "{not-json"));
    expect((await screen.findByRole("status")).textContent).toContain("not valid JSON");

    await user.upload(input, jsonFile("valid.json", JSON.stringify({ ...initialState, operatorName: "Imported Operator" })));
    expect((await screen.findByRole("status")).textContent).toContain("Save restored successfully");
  });
});

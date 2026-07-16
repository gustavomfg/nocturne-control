// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import App from "./App.tsx";
import { NocturneProvider } from "./state/NocturneContext.tsx";

vi.mock("./components/LeafletNocturneMap.tsx", () => ({
  LeafletNocturneMap: () => <div aria-label="Map test surface" />,
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

function setMobileViewport(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query === "(max-width: 820px)" ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderApp(path = "/dashboard") {
  window.history.replaceState(null, "", path);
  sessionStorage.setItem("nocturne-boot-complete", "true");
  return render(<NocturneProvider><App /></NocturneProvider>);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("App navigation", () => {
  it("restores deep links and follows browser back and forward navigation", async () => {
    setMobileViewport(false);
    const user = userEvent.setup();
    renderApp("/gravemere/vesper");

    expect(await screen.findByRole("heading", { name: "Vesper", level: 1 })).toBeTruthy();
    expect(document.title).toBe("Vesper Dossier — Nocturne Control Center");
    await user.click(screen.getByRole("button", { name: /back to gravemere/i }));
    expect(await screen.findByRole("heading", { name: /gravemere archive/i })).toBeTruthy();
    expect(document.title).toBe("Gravemere Archive — Nocturne Control Center");
    await user.click(screen.getByRole("button", { name: /^missions/i }));
    expect(await screen.findByRole("heading", { name: "Mission Control" })).toBeTruthy();
    expect(document.title).toBe("Missions — Nocturne Control Center");
    await user.click(screen.getByRole("button", { name: /^logs/i }));
    expect(await screen.findByRole("heading", { name: "Event Timeline" })).toBeTruthy();
    expect(document.title).toBe("Event Timeline — Nocturne Control Center");

    act(() => window.history.back());
    await waitFor(() => expect(window.location.pathname).toBe("/missions"));
    expect(await screen.findByRole("heading", { name: "Mission Control" })).toBeTruthy();
    expect(document.title).toBe("Missions — Nocturne Control Center");

    act(() => window.history.forward());
    await waitFor(() => expect(window.location.pathname).toBe("/logs"));
    expect(await screen.findByRole("heading", { name: "Event Timeline" })).toBeTruthy();
    expect(document.title).toBe("Event Timeline — Nocturne Control Center");
  });

  it("isolates the page while the mobile navigation drawer is open", async () => {
    setMobileViewport(true);
    const user = userEvent.setup();
    const { container } = renderApp();
    const menuButton = screen.getByRole("button", { name: /menu/i });
    const page = container.querySelector<HTMLElement>(".page-transition");

    await user.click(menuButton);
    expect(page?.hasAttribute("inert")).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: /^dashboard/i })));

    await user.keyboard("{Escape}");
    expect(page?.hasAttribute("inert")).toBe(false);
    await waitFor(() => expect(document.activeElement).toBe(menuButton));
  });

  it("propagates a planned watch through campaign, map and logs", async () => {
    setMobileViewport(false);
    const user = userEvent.setup();
    renderApp("/missions");
    expect(await screen.findByRole("heading", { name: "Mission Control" })).toBeTruthy();

    await user.click((await screen.findAllByRole("button", { name: "Plan operation" }))[0]);
    await screen.findByRole("dialog", { name: "Trace Vesper Broadcast" });
    await user.click(screen.getByRole("button", { name: "Commit plan" }));

    await user.click(screen.getByRole("button", { name: /^night watch/i }));
    expect(await screen.findByText("1 plans committed")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /advance watch/i }));
    expect(await screen.findByRole("heading", { name: /watch 1\.1 consequences/i })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^map/i }));
    const threatMeter = await screen.findByRole("meter", { name: /gravemere threat pressure/i });
    expect(threatMeter.getAttribute("aria-valuenow")).toBe("82");

    await user.click(screen.getByRole("button", { name: /^logs/i }));
    expect(await screen.findByText(/watch advanced\. city stability/i)).toBeTruthy();
    expect(screen.getAllByText("CAMPAIGN").length).toBeGreaterThan(0);
  });
});

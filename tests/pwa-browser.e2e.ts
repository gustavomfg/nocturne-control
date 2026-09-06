import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const appBase = "/nocturne-control/";
const appUrl = `http://127.0.0.1:4173${appBase}`;
const preview = spawn(process.execPath, [
  resolve("node_modules/vite/bin/vite.js"),
  "preview",
  "--host", "127.0.0.1",
  "--port", "4173",
], { stdio: "ignore" });

async function stopPreview() {
  if (preview.exitCode !== null) return;
  if (process.platform === "win32" && preview.pid) {
    spawn("taskkill", ["/pid", String(preview.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    preview.kill("SIGTERM");
  }
  await Promise.race([
    once(preview, "exit"),
    new Promise((resolve) => globalThis.setTimeout(resolve, 2_000)),
  ]);
}

test.beforeAll(async () => {
  await expect.poll(async () => {
    try {
      return (await fetch(appUrl)).ok;
    } catch {
      return false;
    }
  }, { timeout: 15_000 }).toBe(true);
});

test.afterAll(stopPreview);

test("renders the Solaris instrument and reopens the shell offline", async ({ context, page }) => {
  await page.goto(appBase);
  await expect(page.getByRole("heading", { name: "O invisível, em movimento.", level: 1 })).toBeVisible();
  await expect(page).toHaveTitle("Solaris — o invisível, em movimento");
  await expect(page.getByLabel("Instrumento visual interativo")).toBeVisible();

  await page.getByRole("button", { name: "SOL" }).click();
  await expect(page.getByText("Composição / SOL")).toBeVisible();

  const serviceWorkerScope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("Service worker did not take control.")), 10_000);
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.clearTimeout(timeout);
          resolve();
        }, { once: true });
      });
    }

    return registration.scope;
  });
  expect(serviceWorkerScope).toBe(`http://127.0.0.1:4173${appBase}`);

  const cachedUrls = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      urls.push(...(await cache.keys()).map((request) => request.url));
    }
    return urls;
  });
  expect(cachedUrls.some((url) => url.endsWith("/manifest.webmanifest"))).toBe(true);
  expect(cachedUrls.some((url) => /\/assets\/index-[^/]+\.js$/.test(url))).toBe(true);
  expect(cachedUrls.some((url) => /\/assets\/index-[^/]+\.css$/.test(url))).toBe(true);

  const manifest = await page.evaluate(async () => {
    const manifestUrl = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href;
    if (!manifestUrl) throw new Error("Manifest link is missing.");
    return await (await fetch(manifestUrl)).json() as { name?: string; short_name?: string };
  });
  expect(manifest).toMatchObject({ name: "Solaris", short_name: "Solaris" });

  await stopPreview();
  await page.reload();
  await expect(page.getByRole("heading", { name: "O invisível, em movimento.", level: 1 })).toBeVisible();

  await context.close();
});

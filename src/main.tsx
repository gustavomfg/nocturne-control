import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { NocturneProvider } from "./state/NocturneContext";
import "./styles/global.css";
import "./styles/ui.css";
import "./styles/nocturne-theme.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NocturneProvider>
      <App />
    </NocturneProvider>
  </StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
}

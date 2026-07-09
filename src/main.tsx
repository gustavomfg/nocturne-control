import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { NocturneProvider } from "./state/NocturneContext";
import "./styles/global.css";
import "./styles/ui.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NocturneProvider>
      <App />
    </NocturneProvider>
  </StrictMode>
);

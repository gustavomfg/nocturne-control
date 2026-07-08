import { useContext } from "react";

import { NocturneContext } from "./nocturneContext";

export function useNocturne() {
  const context = useContext(NocturneContext);

  if (!context) {
    throw new Error("useNocturne must be used inside NocturneProvider");
  }

  return context;
}

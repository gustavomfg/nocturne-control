export type TerminalLine = {
  id: number;
  text: string;
  type: "command" | "response";
};
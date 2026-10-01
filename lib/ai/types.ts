// What every AI backend must provide. Shared logic (prompts, validation, retries) lives in index.ts.
export type AIProvider = {
  name: "codex" | "api";
  completeJSON(prompt: string, jsonSchema: Record<string, unknown>, imageFiles?: string[]): Promise<unknown>;
  generateImage(prompt: string, outFile: string): Promise<boolean>;
};

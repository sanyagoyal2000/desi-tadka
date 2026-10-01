import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { TMP_DIR, newId } from "../paths";
import type { AIProvider } from "./types";

// Runs `codex exec` non-interactively: prompt on stdin, frames via -i, final answer
// constrained by --output-schema and written to a file with -o.
export function codexProvider(codexPath: string): AIProvider {
  return {
    name: "codex",
    async completeJSON(prompt, jsonSchema, imageFiles = []) {
      const workDir = path.join(TMP_DIR, newId("codex"));
      await mkdir(workDir, { recursive: true });
      const schemaFile = path.join(workDir, "schema.json");
      const outFile = path.join(workDir, "out.json");
      await writeFile(schemaFile, JSON.stringify(jsonSchema));

      const args = ["exec", "--skip-git-repo-check", "--ephemeral", "-s", "read-only", "-C", workDir, "--output-schema", schemaFile, "-o", outFile];
      if (process.env.CODEX_MODEL) args.push("-m", process.env.CODEX_MODEL);
      args.push("-c", `model_reasoning_effort="${process.env.CODEX_REASONING || "low"}"`);
      for (const img of imageFiles) args.push("-i", img);

      try {
        await runWithStdin(codexPath, args, prompt, 240_000);
        return JSON.parse(await readFile(outFile, "utf8"));
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    },
    async generateImage() {
      return false; // Codex CLI can't generate images; the UI shows a "swapped" badge instead.
    },
  };
}

function runWithStdin(cmd: string, args: string[], input: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Codex timed out"));
    }, timeoutMs);
    child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-2000)));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`codex exited ${code}: ${stderr.slice(-500)}`));
    });
    child.stdin.end(input);
  });
}

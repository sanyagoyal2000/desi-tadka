import { readFile, writeFile } from "node:fs/promises";
import OpenAI from "openai";
import type { AIProvider } from "./types";

// OpenAI API mode: Responses API with image inputs + strict JSON schema output, and the Images API.
export function openaiProvider(apiKey: string, model: string, imageModel?: string): AIProvider {
  const client = new OpenAI({ apiKey });
  return {
    name: "api",
    async completeJSON(prompt, jsonSchema, imageFiles = []) {
      const images = await Promise.all(
        imageFiles.map(async (f) => ({
          type: "input_image" as const,
          image_url: `data:image/jpeg;base64,${(await readFile(f)).toString("base64")}`,
          detail: "low" as const,
        })),
      );
      const response = await client.responses.create({
        model,
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }, ...images] }],
        text: { format: { type: "json_schema", name: "result", schema: jsonSchema, strict: true } },
      });
      return JSON.parse(response.output_text);
    },
    async generateImage(prompt, outFile) {
      if (!imageModel) return false;
      const result = await client.images.generate({ model: imageModel, prompt, size: "1024x1024" });
      const b64 = result.data?.[0]?.b64_json;
      if (!b64) return false;
      await writeFile(outFile, Buffer.from(b64, "base64"));
      return true;
    },
  };
}

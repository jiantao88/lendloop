import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { canonicalJson, signPayload } from "../lib/domain/hmac";
import { buildWorkflows } from "../n8n/build.mjs";

const workflowDir = path.join(process.cwd(), "n8n/workflows");

function loadSnippetFns() {
  const source = readFileSync(path.join(process.cwd(), "n8n/lib/hmac.js"), "utf8");
  const context: {
    require: NodeRequire;
    canonicalJson?: (value: unknown) => string;
    signPayload?: (secret: string, timestamp: string, body: string) => string;
  } = { require };
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.canonicalJson = canonicalJson;\nthis.signPayload = signPayload;`, context);
  if (!context.canonicalJson || !context.signPayload) {
    throw new Error("n8n snippet did not export helpers");
  }
  return { canonicalJson: context.canonicalJson, signPayload: context.signPayload };
}

describe("n8n workflows", () => {
  const built = buildWorkflows() as Record<string, { nodes: Array<Record<string, unknown>> }>;

  it("matches the committed JSON exports", () => {
    for (const [name, workflow] of Object.entries(built)) {
      const committed = JSON.parse(readFileSync(path.join(workflowDir, name), "utf8"));
      expect(committed).toEqual(workflow);
    }
  });

  it("signs the same canonical payload as the app", async () => {
    const fns = loadSnippetFns();
    const payload = { b: 1, a: { z: "ok", m: ["x", "y"] } };
    expect(fns.canonicalJson(payload)).toBe(canonicalJson(payload));
    const body = fns.canonicalJson(payload);
    const fromNode = fns.signPayload("shared", "1000", body);
    const fromWeb = await signPayload("shared", "1000", body);
    const fromNodeCrypto = createHmac("sha256", "shared").update(`1000.${body}`).digest("hex");
    expect(fromNode).toBe(fromWeb);
    expect(fromNode).toBe(fromNodeCrypto);
  });

  it("keeps secrets out of the export and retries outbound calls", () => {
    const raw = JSON.stringify(built);
    expect(raw).not.toMatch(/LENDLOOP_WEBHOOK_SECRET"\s*:\s*"/);
    expect(raw).toContain("$env.LENDLOOP_WEBHOOK_SECRET");
    expect(raw).not.toMatch(/sk_live_|whsec_|AKIA/);
    const overdue = built["overdue-reminders.json"];
    const outbound = overdue.nodes.filter((node) => node.type === "n8n-nodes-base.httpRequest");
    expect(outbound.length).toBe(2);
    expect(outbound.every((node) => node.retryOnFail === true && node.maxTries === 3)).toBe(true);
    expect(built["error-workflow.json"].nodes.some((node) => node.type === "n8n-nodes-base.errorTrigger")).toBe(
      true,
    );
  });
});

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const hmac = readFileSync(path.join(root, "lib/hmac.js"), "utf8").trim();

function code(name, id, position, jsCode) {
  return {
    parameters: { language: "javaScript", jsCode },
    id,
    name,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position,
  };
}

function http(name, id, position, url) {
  return {
    parameters: {
      method: "POST",
      url,
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Content-Type", value: "application/json" },
          { name: "X-LendLoop-Timestamp", value: "={{ $json.timestamp }}" },
          { name: "X-LendLoop-Signature", value: "={{ $json.signature }}" },
        ],
      },
      sendBody: true,
      contentType: "raw",
      rawContentType: "application/json",
      body: "={{ $json.body }}",
      options: { timeout: 15000 },
    },
    id,
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: "stopWorkflow",
  };
}

function sticky(id, position, content) {
  return {
    parameters: { content, height: 220, width: 360, color: 4 },
    id,
    name: "Setup note",
    type: "n8n-nodes-base.stickyNote",
    typeVersion: 1,
    position,
  };
}

const setupNote =
  "## LendLoop setup\n" +
  "Set container env `LENDLOOP_WEBHOOK_SECRET` and `CONVEX_SITE_URL`.\n" +
  "Do not paste the secret into this workflow.\n" +
  "After importing the error workflow, open this workflow's Settings and choose it as the Error Workflow, then activate.";

function connect(map) {
  return Object.fromEntries(
    Object.entries(map).map(([from, to]) => [
      from,
      { main: [[{ node: to, type: "main", index: 0 }]] },
    ]),
  );
}

export function buildWorkflows() {
  const request = {
    name: "LendLoop — request notification",
    nodes: [
      sticky("11111111-1111-4111-8111-111111111111", [-40, -180], setupNote),
      {
        parameters: {
          httpMethod: "POST",
          path: "lendloop-request",
          responseMode: "responseNode",
          options: {},
        },
        id: "11111111-1111-4111-8111-111111111112",
        name: "Request webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [240, 80],
        webhookId: "lendloop-request",
      },
      code(
        "Verify and log",
        "11111111-1111-4111-8111-111111111113",
        [520, 80],
        `${hmac}

const secret = requireSecret();
const item = $input.first().json;
const headers = item.headers ?? {};
const payload = item.body && typeof item.body === "object" ? item.body : item;
const timestamp = String(headers["x-lendloop-timestamp"] ?? headers["X-LendLoop-Timestamp"] ?? "");
const signature = String(headers["x-lendloop-signature"] ?? headers["X-LendLoop-Signature"] ?? "").toLowerCase();
if (!timestamp || !signature) throw new Error("Missing HMAC headers");
const body = canonicalJson(payload);
const expected = signPayload(secret, timestamp, body);
const skew = Math.abs(Date.now() - Number(timestamp));
if (!Number.isFinite(Number(timestamp)) || skew > 5 * 60 * 1000) {
  throw new Error("Invalid HMAC signature");
}
if (expected.length !== signature.length) throw new Error("Invalid HMAC signature");
let diff = 0;
for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
if (diff !== 0) throw new Error("Invalid HMAC signature");
const fields = ["event", "loanId", "status", "toolName", "category", "startDate", "endDate", "recipientRole", "recipientEmail"];
const minimized = {};
for (const key of fields) minimized[key] = payload[key];
const notification = "[LendLoop] " + minimized.status + " · " + minimized.toolName + " · " + minimized.startDate + " to " + minimized.endDate + " → " + minimized.recipientRole + " " + minimized.recipientEmail;
return [{ json: { ok: true, notification, minimized } }];
`,
      ),
      {
        parameters: {
          respondWith: "json",
          responseBody: "={{ { ok: true } }}",
          options: {},
        },
        id: "11111111-1111-4111-8111-111111111114",
        name: "Respond",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1.1,
        position: [800, 80],
      },
    ],
    connections: connect({
      "Request webhook": "Verify and log",
      "Verify and log": "Respond",
    }),
    active: false,
    settings: { executionOrder: "v1" },
    pinData: {},
  };

  const overdue = {
    name: "LendLoop — overdue reminders",
    nodes: [
      sticky("22222222-2222-4222-8222-222222222221", [-40, -180], setupNote),
      {
        parameters: {
          rule: {
            interval: [{ field: "days", daysInterval: 1, triggerAtHour: 9, triggerAtMinute: 0 }],
          },
        },
        id: "22222222-2222-4222-8222-222222222222",
        name: "Daily at 09:00 UTC",
        type: "n8n-nodes-base.scheduleTrigger",
        typeVersion: 1.2,
        position: [240, 80],
      },
      code(
        "Sign overdue query",
        "22222222-2222-4222-8222-222222222223",
        [520, 80],
        `${hmac}

const secret = requireSecret();
const asOf = new Date().toISOString().slice(0, 10);
const body = canonicalJson({ asOf });
const timestamp = Date.now().toString();
return [{ json: { body, timestamp, signature: signPayload(secret, timestamp, body), asOf } }];
`,
      ),
      http(
        "Fetch overdue loans",
        "22222222-2222-4222-8222-222222222224",
        [800, 80],
        "={{ $env.CONVEX_SITE_URL.replace(/\\/$/, '') + '/n8n/overdue' }}",
      ),
      code(
        "One item per loan",
        "22222222-2222-4222-8222-222222222225",
        [1080, 80],
        `const response = $input.first().json;
const loans = Array.isArray(response.loans) ? response.loans : [];
return loans.map((loan) => ({
  json: {
    ...loan,
    notification: "[LendLoop] overdue · " + loan.toolName + " · due " + loan.endDate + " → borrower " + loan.borrowerEmail,
  },
}));
`,
      ),
      code(
        "Sign reminder write-back",
        "22222222-2222-4222-8222-222222222226",
        [1360, 80],
        `${hmac}

const secret = requireSecret();
const loan = $input.first().json;
const payload = {
  loanId: loan.loanId,
  asOf: loan.asOf,
  idempotencyKey: loan.idempotencyKey,
};
const body = canonicalJson(payload);
const timestamp = Date.now().toString();
return [{
  json: {
    body,
    timestamp,
    signature: signPayload(secret, timestamp, body),
    notification: loan.notification,
  },
}];
`,
      ),
      http(
        "Write reminder back",
        "22222222-2222-4222-8222-222222222227",
        [1640, 80],
        "={{ $env.CONVEX_SITE_URL.replace(/\\/$/, '') + '/n8n/reminders' }}",
      ),
    ],
    connections: connect({
      "Daily at 09:00 UTC": "Sign overdue query",
      "Sign overdue query": "Fetch overdue loans",
      "Fetch overdue loans": "One item per loan",
      "One item per loan": "Sign reminder write-back",
      "Sign reminder write-back": "Write reminder back",
    }),
    active: false,
    settings: { executionOrder: "v1", timezone: "UTC" },
    pinData: {},
  };

  const errors = {
    name: "LendLoop — error workflow",
    nodes: [
      sticky(
        "33333333-3333-4333-8333-333333333331",
        [-40, -180],
        "## Error workflow\nImport this first. In the other two LendLoop workflows, set Settings → Error Workflow to this workflow so failed runs stay visible.\nThe secret stays in the n8n environment.",
      ),
      {
        parameters: {},
        id: "33333333-3333-4333-8333-333333333332",
        name: "On workflow error",
        type: "n8n-nodes-base.errorTrigger",
        typeVersion: 1,
        position: [240, 80],
      },
      code(
        "Minimize and sign",
        "33333333-3333-4333-8333-333333333333",
        [520, 80],
        `${hmac}

const secret = requireSecret();
const raw = $input.first().json;
const executionId = String(raw.execution?.id ?? Date.now());
const workflowName = String(raw.workflow?.name ?? "workflow");
let message = String(raw.execution?.error?.message ?? "Workflow failed");
message = message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, "[redacted]").replace(/\\s+/g, " ").trim().slice(0, 300);
const payload = {
  kind: "workflow_error",
  idempotencyKey: "error:" + executionId.replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 80),
  summary: (workflowName + ": " + (message || "Workflow failed")).slice(0, 300),
};
const body = canonicalJson(payload);
const timestamp = Date.now().toString();
return [{ json: { body, timestamp, signature: signPayload(secret, timestamp, body) } }];
`,
      ),
      http(
        "Record the failure",
        "33333333-3333-4333-8333-333333333334",
        [800, 80],
        "={{ $env.CONVEX_SITE_URL.replace(/\\/$/, '') + '/n8n/errors' }}",
      ),
    ],
    connections: connect({
      "On workflow error": "Minimize and sign",
      "Minimize and sign": "Record the failure",
    }),
    active: false,
    settings: { executionOrder: "v1" },
    pinData: {},
  };

  return {
    "request-notification.json": request,
    "overdue-reminders.json": overdue,
    "error-workflow.json": errors,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.join(root, "workflows");
  mkdirSync(dir, { recursive: true });
  for (const [name, workflow] of Object.entries(buildWorkflows())) {
    writeFileSync(path.join(dir, name), `${JSON.stringify(workflow, null, 2)}\n`);
  }
}

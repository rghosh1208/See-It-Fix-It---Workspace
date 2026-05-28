/**
 * Qualtrics Survey Response Export v3 client.
 *
 * Docs: https://api.qualtrics.com/u9e5lh4172v0v-export-responses
 *
 * Flow:
 *   1. POST  /export-responses                       → progressId
 *   2. GET   /export-responses/{progressId}          → poll until status=complete
 *   3. GET   /export-responses/{progressId}/file     → JSON payload (zipped)
 *
 * Because step 2 can take well over 60 seconds for larger surveys (and Vercel
 * Hobby caps a function at 60s), we expose the stages individually. The cron
 * route persists the `progressId` between runs and picks up where it left off.
 */

import { gunzipSync } from "node:zlib";

const QUALTRICS_BASE = (datacenter: string) =>
  `https://${datacenter}.qualtrics.com/API/v3`;

type ExportStartResp = {
  result: { progressId: string; percentComplete: number; status: string };
};
type ExportProgressResp = {
  result: {
    percentComplete: number;
    status: "inProgress" | "complete" | "failed";
    fileId?: string;
  };
};

export type QualtricsResponse = {
  responseId: string;
  values: Record<string, unknown>;
  labels?: Record<string, string>;
  displayedFields?: string[];
  displayedValues?: Record<string, string[]>;
};

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

async function jsonFetch<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Qualtrics ${res.status} ${res.statusText}: ${body}`);
  }
  return (await res.json()) as T;
}

function qualtricsHeaders() {
  const token = env("QUALTRICS_API_TOKEN");
  return {
    "X-API-TOKEN": token,
    "Content-Type": "application/json",
  };
}

function qualtricsBaseSurvey() {
  const surveyId = env("QUALTRICS_SURVEY_ID");
  const datacenter = env("QUALTRICS_DATACENTER");
  return `${QUALTRICS_BASE(datacenter)}/surveys/${surveyId}`;
}

/** Start an export. Returns the progressId to poll later. */
export async function startExport(opts: {
  startDate?: string;
}): Promise<string> {
  // NOTE: Qualtrics rejects `useLabels` for JSON/NDJSON exports (RTE_7.2).
  // JSON exports always key on Q-IDs and include labels separately on each
  // response, so we don't need the flag anyway.
  const startBody: Record<string, unknown> = {
    format: "json",
    compress: true,
  };
  if (opts.startDate) startBody.startDate = opts.startDate;

  const start = await jsonFetch<ExportStartResp>(
    `${qualtricsBaseSurvey()}/export-responses`,
    {
      method: "POST",
      headers: qualtricsHeaders(),
      body: JSON.stringify(startBody),
    },
  );
  return start.result.progressId;
}

/**
 * Check progress on an in-flight export. Polls up to `maxPollMs` (default 20s)
 * for status=complete, then returns. Caller decides what to do based on the
 * status returned.
 */
export async function pollExport(
  progressId: string,
  opts: { maxPollMs?: number } = {},
): Promise<
  | { status: "complete"; fileId: string }
  | { status: "inProgress"; percentComplete: number }
  | { status: "failed" }
> {
  const maxPollMs = opts.maxPollMs ?? 20_000;
  const deadline = Date.now() + maxPollMs;
  let lastPercent = 0;

  // First check immediately, no initial sleep, then poll every 1.5s.
  let first = true;
  while (Date.now() < deadline || first) {
    if (!first) {
      await new Promise((r) => setTimeout(r, 1500));
    }
    first = false;
    const prog = await jsonFetch<ExportProgressResp>(
      `${qualtricsBaseSurvey()}/export-responses/${progressId}`,
      { headers: qualtricsHeaders() },
    );
    lastPercent = prog.result.percentComplete;
    if (prog.result.status === "failed") return { status: "failed" };
    if (prog.result.status === "complete" && prog.result.fileId) {
      return { status: "complete", fileId: prog.result.fileId };
    }
  }
  return { status: "inProgress", percentComplete: lastPercent };
}

/** Download the completed export file and parse it. */
export async function downloadExport(
  progressId: string,
): Promise<QualtricsResponse[]> {
  const token = env("QUALTRICS_API_TOKEN");
  const fileRes = await fetch(
    `${qualtricsBaseSurvey()}/export-responses/${progressId}/file`,
    { headers: { "X-API-TOKEN": token } },
  );
  if (!fileRes.ok) {
    throw new Error(`Qualtrics file download failed: ${fileRes.status}`);
  }
  const buf = Buffer.from(await fileRes.arrayBuffer());
  const json = await unzipFirstJson(buf);
  const parsed = JSON.parse(json) as { responses: QualtricsResponse[] };
  return parsed.responses ?? [];
}

/**
 * Convenience wrapper for non-cron callers (e.g. one-shot scripts). Not used
 * by the cron route because it can exceed 60s.
 */
export async function fetchQualtricsResponses(opts: {
  startDate?: string;
}): Promise<QualtricsResponse[]> {
  const progressId = await startExport(opts);
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const p = await pollExport(progressId, { maxPollMs: 10_000 });
    if (p.status === "complete") return downloadExport(progressId);
    if (p.status === "failed") {
      throw new Error("Qualtrics export reported status=failed");
    }
  }
  throw new Error("Qualtrics export timed out");
}

/**
 * Tiny ZIP reader for the single-file case Qualtrics gives us.
 * We avoid pulling in a heavyweight zip library by parsing the local file
 * header manually and inflating the deflated stream with `node:zlib`.
 */
async function unzipFirstJson(buf: Buffer): Promise<string> {
  // ZIP local file header: 0x04034b50
  if (buf.readUInt32LE(0) !== 0x04034b50) {
    return buf.toString("utf8");
  }
  const compressionMethod = buf.readUInt16LE(8);
  const compressedSize = buf.readUInt32LE(18);
  const fileNameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const dataStart = 30 + fileNameLen + extraLen;
  const dataEnd = dataStart + compressedSize;
  const data = buf.subarray(dataStart, dataEnd);

  if (compressionMethod === 0) return data.toString("utf8");
  const { inflateRawSync } = await import("node:zlib");
  return inflateRawSync(data).toString("utf8");
}

export const _internal = { unzipFirstJson, gunzipSync };

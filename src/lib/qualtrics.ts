/**
 * Minimal Qualtrics Survey Response Export v3 client.
 *
 * Docs: https://api.qualtrics.com/u9e5lh4172v0v-export-responses
 *
 * Flow:
 *   1. POST  /export-responses                       → progressId
 *   2. GET   /export-responses/{progressId}          → poll until status=complete
 *   3. GET   /export-responses/{progressId}/file     → JSON payload (zipped)
 *
 * We request `format=json` with `useLabels=false` (Q-IDs as keys), then unzip
 * client-side and stream `responses[]`.
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

/**
 * Trigger and download a full Qualtrics response export, returning the parsed
 * responses array. If `startDate` is given (ISO timestamp), only responses
 * recorded after that date are returned — this is how the cron does
 * incremental sync.
 */
export async function fetchQualtricsResponses(opts: {
  startDate?: string;
  signal?: AbortSignal;
}): Promise<QualtricsResponse[]> {
  const token = env("QUALTRICS_API_TOKEN");
  const surveyId = env("QUALTRICS_SURVEY_ID");
  const datacenter = env("QUALTRICS_DATACENTER");
  const base = QUALTRICS_BASE(datacenter);

  const headers = {
    "X-API-TOKEN": token,
    "Content-Type": "application/json",
  };

  // 1. Start the export.
  // NOTE: Qualtrics rejects `useLabels` for JSON/NDJSON exports (RTE_7.2).
  // JSON exports always key on Q-IDs and include labels separately on each
  // response, so we don't need the flag anyway.
  const startBody: Record<string, unknown> = {
    format: "json",
    compress: true,
  };
  if (opts.startDate) startBody.startDate = opts.startDate;

  const start = await jsonFetch<ExportStartResp>(
    `${base}/surveys/${surveyId}/export-responses`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(startBody),
      signal: opts.signal,
    },
  );
  const progressId = start.result.progressId;

  // 2. Poll until complete (timeout ~60s).
  const deadline = Date.now() + 60_000;
  let fileId: string | undefined;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const prog = await jsonFetch<ExportProgressResp>(
      `${base}/surveys/${surveyId}/export-responses/${progressId}`,
      { headers, signal: opts.signal },
    );
    if (prog.result.status === "failed") {
      throw new Error("Qualtrics export reported status=failed");
    }
    if (prog.result.status === "complete") {
      fileId = prog.result.fileId;
      break;
    }
  }
  if (!fileId) throw new Error("Qualtrics export timed out");

  // 3. Download the file. Qualtrics returns a zipped JSON. With compress:true
  //    the actual transfer is gzipped by the HTTP layer; the body itself is a
  //    zip archive containing a single JSON file.
  const fileRes = await fetch(
    `${base}/surveys/${surveyId}/export-responses/${progressId}/file`,
    { headers: { "X-API-TOKEN": token }, signal: opts.signal },
  );
  if (!fileRes.ok) {
    throw new Error(`Qualtrics file download failed: ${fileRes.status}`);
  }
  const buf = Buffer.from(await fileRes.arrayBuffer());

  // The file payload is a ZIP archive containing one JSON file.
  const json = await unzipFirstJson(buf);
  const parsed = JSON.parse(json) as { responses: QualtricsResponse[] };
  return parsed.responses ?? [];
}

/**
 * Tiny ZIP reader for the single-file case Qualtrics gives us.
 * We avoid pulling in a heavyweight zip library by parsing the local file
 * header manually and inflating the deflated stream with `node:zlib`.
 */
async function unzipFirstJson(buf: Buffer): Promise<string> {
  // ZIP local file header: 0x04034b50
  if (buf.readUInt32LE(0) !== 0x04034b50) {
    // Not a ZIP — maybe Qualtrics already gave us raw JSON.
    return buf.toString("utf8");
  }
  const compressionMethod = buf.readUInt16LE(8); // 0=store, 8=deflate
  const compressedSize = buf.readUInt32LE(18);
  const fileNameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const dataStart = 30 + fileNameLen + extraLen;
  const dataEnd = dataStart + compressedSize;
  const data = buf.subarray(dataStart, dataEnd);

  if (compressionMethod === 0) return data.toString("utf8");

  // method 8 = raw deflate. Node's zlib needs inflateRawSync for ZIP entries.
  const { inflateRawSync } = await import("node:zlib");
  return inflateRawSync(data).toString("utf8");
}

// Re-export for tests / callers that want the raw helpers
export const _internal = { unzipFirstJson, gunzipSync };

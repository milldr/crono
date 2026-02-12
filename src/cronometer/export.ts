/**
 * Cronometer export API client.
 *
 * Generates a single-use nonce via GWT RPC, then fetches CSV data
 * from the /export endpoint. No browser automation required.
 */

import { getCredential } from "../credentials.js";
import { loadConfig } from "../config.js";
import { login, type CronometerSession } from "./auth.js";

const BASE_URL = "https://cronometer.com";

const DEFAULT_GWT_PERMUTATION = "7B121DC5483BF272B1BC1916DA9FA963";
const DEFAULT_GWT_HEADER = "2D6A926E3729946302DC68073CB0D550";

export type ExportType = "nutrition" | "exercises" | "biometrics";

const EXPORT_TYPE_MAP: Record<ExportType, string> = {
  nutrition: "dailySummary",
  exercises: "exercises",
  biometrics: "biometrics",
};

/** Build GWT RPC body for generateAuthorizationToken. */
export function buildNonceBody(
  gwtHeader: string,
  sesnonce: string,
  userId: number
): string {
  return `7|0|8|https://cronometer.com/cronometer/|${gwtHeader}|com.cronometer.shared.rpc.CronometerService|generateAuthorizationToken|java.lang.String/2004016611|I|com.cronometer.shared.user.AuthScope/2065601159|${sesnonce}|1|2|3|4|4|5|6|6|7|8|${userId}|3600|7|2|`;
}

/** Extract the nonce from a GWT RPC response. */
export function parseNonce(body: string): string | null {
  // Response format: //OK[1,["<32-char-hex>"],...] or //OK["<32-char-hex>",...]
  const match = body.match(/"([a-f0-9]{32,})"/);
  return match ? match[1] : null;
}

/** Generate a single-use authorization nonce. */
export async function generateNonce(
  session: CronometerSession,
  gwtPermutation?: string,
  gwtHeader?: string
): Promise<string> {
  const permutation = gwtPermutation || DEFAULT_GWT_PERMUTATION;
  const header = gwtHeader || DEFAULT_GWT_HEADER;
  const body = buildNonceBody(header, session.sesnonce, session.userId);

  const res = await fetch(`${BASE_URL}/cronometer/app`, {
    method: "POST",
    headers: {
      "Content-Type": "text/x-gwt-rpc; charset=UTF-8",
      "X-GWT-Module-Base": "https://cronometer.com/cronometer/",
      "X-GWT-Permutation": permutation,
      Cookie: session.cookies,
    },
    body,
  });

  const text = await res.text();
  const nonce = parseNonce(text);
  if (!nonce) {
    throw new Error(
      "Cronometer API error. GWT values may be outdated. See docs for override instructions."
    );
  }

  return nonce;
}

/** Fetch CSV export data from Cronometer. */
export async function fetchExport(
  session: CronometerSession,
  type: ExportType,
  start: string,
  end: string,
  gwtPermutation?: string,
  gwtHeader?: string
): Promise<string> {
  const nonce = await generateNonce(session, gwtPermutation, gwtHeader);
  const generate = EXPORT_TYPE_MAP[type];

  const url = `${BASE_URL}/export?nonce=${nonce}&generate=${generate}&start=${start}&end=${end}`;
  const res = await fetch(url, {
    headers: { Cookie: session.cookies },
  });

  if (!res.ok) {
    throw new Error(`Export failed: ${res.status}`);
  }

  return res.text();
}

/**
 * Top-level export orchestrator.
 * Reads credentials, authenticates, fetches and returns raw CSV.
 */
export async function exportData(
  type: ExportType,
  start: string,
  end: string,
  onStatus?: (msg: string) => void
): Promise<string> {
  const username = getCredential("cronometer-username");
  const password = getCredential("cronometer-password");

  if (!username || !password) {
    throw new Error("No Cronometer credentials found. Run: crono login");
  }

  // Resolve GWT overrides: env vars > config > defaults
  const config = loadConfig();
  const gwtPermutation =
    process.env.CRONO_GWT_PERMUTATION || config.gwtPermutation;
  const gwtHeader = process.env.CRONO_GWT_HEADER || config.gwtHeader;

  onStatus?.("Logging in...");
  const session = await login(username, password, gwtPermutation, gwtHeader);

  onStatus?.("Fetching data...");
  const csv = await fetchExport(
    session,
    type,
    start,
    end,
    gwtPermutation,
    gwtHeader
  );

  return csv;
}

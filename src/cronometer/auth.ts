/**
 * Direct HTTP authentication with Cronometer.
 *
 * Three-step flow:
 * 1. GET /login/ — parse anticsrf token and JSESSIONID cookie
 * 2. POST /login — form-encoded login, get sesnonce cookie
 * 3. POST /cronometer/app — GWT RPC authenticate, get user ID
 */

const BASE_URL = "https://cronometer.com";

const DEFAULT_GWT_PERMUTATION = "7B121DC5483BF272B1BC1916DA9FA963";
const DEFAULT_GWT_HEADER = "2D6A926E3729946302DC68073CB0D550";

export interface CronometerSession {
  jsessionId: string;
  sesnonce: string;
  userId: number;
}

/** Extract a named cookie value from a set-cookie header array. */
export function extractCookie(headers: Headers, name: string): string | null {
  const cookies = headers.getSetCookie();
  for (const cookie of cookies) {
    const match = cookie.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

/** Parse the anticsrf token from Cronometer's login page HTML. */
export function parseAnticsrf(html: string): string | null {
  const match = html.match(/name=["']anticsrf["']\s+value=["']([^"']+)["']/);
  return match ? match[1] : null;
}

/** Extract user ID from GWT authenticate response. */
export function parseUserId(body: string): number | null {
  // GWT response format: //OK[<id>,...]
  // The user ID is a large negative number in the response array
  const match = body.match(/\/\/OK\[(-?\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** Build GWT RPC body for the authenticate call. */
export function buildAuthenticateBody(gwtHeader: string): string {
  const tzOffset = new Date().getTimezoneOffset();
  return `7|0|5|https://cronometer.com/cronometer/|${gwtHeader}|com.cronometer.shared.rpc.CronometerService|authenticate|java.lang.Integer/3438268394|1|2|3|4|1|5|5|${tzOffset}|`;
}

function gwtHeaders(
  gwtPermutation: string,
  cookies: string
): Record<string, string> {
  return {
    "Content-Type": "text/x-gwt-rpc; charset=UTF-8",
    "X-GWT-Module-Base": "https://cronometer.com/cronometer/",
    "X-GWT-Permutation": gwtPermutation,
    Cookie: cookies,
  };
}

/**
 * Authenticate with Cronometer via HTTP.
 * Returns a session object with cookies and user ID.
 */
export async function login(
  username: string,
  password: string,
  gwtPermutation?: string,
  gwtHeader?: string
): Promise<CronometerSession> {
  const permutation = gwtPermutation || DEFAULT_GWT_PERMUTATION;
  const header = gwtHeader || DEFAULT_GWT_HEADER;

  // Step 1: GET /login/ — get anticsrf + JSESSIONID
  const loginPageRes = await fetch(`${BASE_URL}/login/`, {
    redirect: "manual",
  });
  const loginPageHtml = await loginPageRes.text();

  const anticsrf = parseAnticsrf(loginPageHtml);
  if (!anticsrf) {
    throw new Error("Failed to parse anticsrf token from login page");
  }

  const jsessionId = extractCookie(loginPageRes.headers, "JSESSIONID");
  if (!jsessionId) {
    throw new Error("No JSESSIONID cookie received from login page");
  }

  // Step 2: POST /login — form login
  const formBody = new URLSearchParams({
    username,
    password,
    anticsrf,
  });

  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `JSESSIONID=${jsessionId}`,
    },
    body: formBody.toString(),
    redirect: "manual",
  });

  const loginJson = (await loginRes.json()) as { success?: boolean };
  if (!loginJson.success) {
    throw new Error(
      "Cronometer login failed. Check your credentials with: crono login"
    );
  }

  const sesnonce = extractCookie(loginRes.headers, "sesnonce");
  if (!sesnonce) {
    throw new Error("No sesnonce cookie received after login");
  }

  // Step 3: POST /cronometer/app — GWT authenticate
  const cookies = `JSESSIONID=${jsessionId}; sesnonce=${sesnonce}`;
  const authBody = buildAuthenticateBody(header);

  const authRes = await fetch(`${BASE_URL}/cronometer/app`, {
    method: "POST",
    headers: gwtHeaders(permutation, cookies),
    body: authBody,
  });

  const authText = await authRes.text();
  const userId = parseUserId(authText);
  if (userId === null) {
    throw new Error(
      "Cronometer API error. GWT values may be outdated. See docs for override instructions."
    );
  }

  return { jsessionId, sesnonce, userId };
}

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
  cookies: string;
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

/** Collect all cookies from set-cookie headers as "name=value; name2=value2" string. */
export function collectCookies(headers: Headers): string {
  const cookies = headers.getSetCookie();
  const pairs: string[] = [];
  for (const cookie of cookies) {
    const match = cookie.match(/^([^=]+)=([^;]+)/);
    if (match) pairs.push(`${match[1]}=${match[2]}`);
  }
  return pairs.join("; ");
}

/** Merge two cookie strings, with later values overriding earlier ones. */
export function mergeCookies(a: string, b: string): string {
  const map = new Map<string, string>();
  for (const str of [a, b]) {
    for (const pair of str.split("; ")) {
      const eq = pair.indexOf("=");
      if (eq > 0) map.set(pair.substring(0, eq), pair.substring(eq + 1));
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
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

  const step1Cookies = collectCookies(loginPageRes.headers);
  const jsessionId = extractCookie(loginPageRes.headers, "JSESSIONID");
  if (!jsessionId) {
    throw new Error("No JSESSIONID cookie received from login page");
  }

  // Step 2: POST /login — form login (send all step 1 cookies including anticsrf cookie)
  const formBody = new URLSearchParams({
    username,
    password,
    anticsrf,
  });

  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: step1Cookies,
    },
    body: formBody.toString(),
    redirect: "manual",
  });

  const sesnonce = extractCookie(loginRes.headers, "sesnonce");

  // Check for login errors — parse body as JSON
  const loginText = await loginRes.text();
  try {
    const loginJson = JSON.parse(loginText) as {
      error?: string;
    };
    if (loginJson.error) {
      throw new Error(
        loginJson.error.includes("Too Many Attempts")
          ? "Cronometer rate limit hit. Please wait a minute and try again."
          : "Cronometer login failed. Check your credentials with: crono login"
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("Cronometer")) throw e;
    // Non-JSON response (e.g. redirect body) — check sesnonce as success indicator
    if (!sesnonce) {
      throw new Error(
        "Cronometer login failed. Check your credentials with: crono login"
      );
    }
  }
  if (!sesnonce) {
    throw new Error("No sesnonce cookie received after login");
  }

  // Step 3: POST /cronometer/app — GWT authenticate
  const step2Cookies = collectCookies(loginRes.headers);
  const cookies = mergeCookies(step1Cookies, step2Cookies);
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

  // Step 3 rotates the sesnonce — use the new one if present
  const step3Cookies = collectCookies(authRes.headers);
  const finalCookies = mergeCookies(cookies, step3Cookies);
  const newSesnonce = extractCookie(authRes.headers, "sesnonce") || sesnonce;

  return { cookies: finalCookies, sesnonce: newSesnonce, userId };
}

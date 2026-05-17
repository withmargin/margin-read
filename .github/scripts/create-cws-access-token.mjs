import { appendFileSync } from "node:fs";
import { createSign } from "node:crypto";

const credentials = JSON.parse(process.env.CWS_SERVICE_ACCOUNT_JSON ?? "{}");
const tokenUri = credentials.token_uri ?? "https://oauth2.googleapis.com/token";

if (!credentials.client_email || !credentials.private_key) {
  throw new Error("CWS_SERVICE_ACCOUNT_JSON must include client_email and private_key.");
}

const now = Math.floor(Date.now() / 1000);
const header = { alg: "RS256", typ: "JWT" };
const claim = {
  iss: credentials.client_email,
  scope: "https://www.googleapis.com/auth/chromewebstore",
  aud: tokenUri,
  iat: now,
  exp: now + 3600
};

const encodedHeader = base64Url(JSON.stringify(header));
const encodedClaim = base64Url(JSON.stringify(claim));
const signingInput = `${encodedHeader}.${encodedClaim}`;
const signature = createSign("RSA-SHA256").update(signingInput).end().sign(credentials.private_key);
const assertion = `${signingInput}.${base64Url(signature)}`;
const response = await fetch(tokenUri, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  })
});

if (!response.ok) {
  throw new Error(`Failed to create access token: ${response.status} ${await response.text()}`);
}

const token = (await response.json()).access_token;
if (!token) {
  throw new Error("Token response did not include access_token.");
}

console.log(`::add-mask::${token}`);
appendFileSync(process.env.GITHUB_ENV, `CWS_ACCESS_TOKEN=${token}\n`);

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

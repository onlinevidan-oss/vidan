/**
 * Google Analytics 4 Data API клиент.
 *
 * Service account-аар JWT угсарч access token авна — гуравдагч сан
 * (googleapis) нэмээгүй: төсөлд шаардлагатай нь ганцхан `runReport`.
 *
 * Тохиргоо (.env.local ба Vercel):
 *   GA4_PROPERTY_ID          — GA4 property-ийн 9 оронтой дугаар
 *   GA4_SERVICE_ACCOUNT_B64  — service account JSON, base64-ээр
 *
 * ⚠️ Тохируулаагүй бол алдаа шидэхгүй — `isGa4Configured()` false буцааж,
 *    хуудас "тохируулаагүй" гэсэн мессеж харуулна. Production дээр env
 *    нэмэхээс өмнө апп унахгүй байх нь чухал.
 */
import "server-only";
import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

type ServiceAccount = { client_email: string; private_key: string };

function serviceAccount(): ServiceAccount | null {
  const b64 = process.env.GA4_SERVICE_ACCOUNT_B64?.trim();
  if (!b64) return null;
  try {
    const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    return sa?.client_email && sa?.private_key ? sa : null;
  } catch {
    return null;
  }
}

export function isGa4Configured(): boolean {
  return !!process.env.GA4_PROPERTY_ID?.trim() && !!serviceAccount();
}

/**
 * Access token — хүчинтэй хугацаанд нь дахин ашиглана.
 * Serverless орчинд instance тус бүр өөрийн cache-тэй байх нь хэвийн:
 * token авах нь хямд, харин хүсэлт бүрд авах нь илүүц.
 */
let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const sa = serviceAccount();
  if (!sa) throw new Error("GA4 service account тохируулаагүй");

  const now = Math.floor(Date.now() / 1000);
  const enc = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  const header = enc({ alg: "RS256", typ: "JWT" });
  const claims = enc({
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  });
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(sa.private_key)
    .toString("base64url");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });

  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!json.access_token) {
    throw new Error(`GA4 token авахад алдаа: ${json.error ?? res.status}`);
  }
  cached = { token: json.access_token, expiresAt: Date.now() + 3_500_000 };
  return json.access_token;
}

export type Ga4Row = { dims: string[]; metrics: number[] };

export type Ga4ReportRequest = {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  metrics: string[];
  /** Аль метрикээр буурахаар эрэмбэлэх (индекс) */
  orderByMetric?: number;
  /** Хэмжигдэхүүнээр өсөхөөр эрэмбэлэх (жнь. огноо) */
  orderByDimension?: number;
  limit?: number;
};

/** GA4 runReport — мөрүүдийг энгийн хэлбэрт хөрвүүлж буцаана */
export async function runGa4Report(req: Ga4ReportRequest): Promise<Ga4Row[]> {
  const property = process.env.GA4_PROPERTY_ID?.trim();
  if (!property) throw new Error("GA4_PROPERTY_ID тохируулаагүй");

  const orderBys =
    req.orderByMetric !== undefined
      ? [{ metric: { metricName: req.metrics[req.orderByMetric] }, desc: true }]
      : req.orderByDimension !== undefined
        ? [{ dimension: { dimensionName: req.dimensions![req.orderByDimension] } }]
        : undefined;

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: req.startDate, endDate: req.endDate }],
        dimensions: req.dimensions?.map((name) => ({ name })),
        metrics: req.metrics.map((name) => ({ name })),
        ...(orderBys ? { orderBys } : {}),
        ...(req.limit ? { limit: req.limit } : {}),
      }),
      // Next 16-д fetch өгөгдмөлөөр кэшлэгддэггүй — traffic шинэ байх ёстой
    },
  );

  const json = (await res.json()) as {
    rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[];
    error?: { message: string; status: string };
  };
  if (json.error) {
    throw new Error(`GA4: ${json.error.status} — ${json.error.message}`);
  }

  return (json.rows ?? []).map((r) => ({
    dims: (r.dimensionValues ?? []).map((d) => d.value),
    metrics: (r.metricValues ?? []).map((m) => Number(m.value) || 0),
  }));
}

/**
 * Сайтын traffic — GA4 Data API-аас.
 *
 * Тайлангийн хугацааны сонголтыг (report-period) хуваалцана — санхүүгийн
 * тайлантай ижил завсраар харьцуулах боломжтой байх нь чухал.
 */
import { isGa4Configured, runGa4Report } from "@/lib/ga4";
import { periodDayKeys, type ReportPeriod } from "@/lib/report-period";
import {
  classifyTraffic,
  type ClassifiedTraffic,
} from "@/lib/traffic-source";

export type TrafficTotals = {
  users: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
  /** Сешн тутамд ногдох хуудасны үзэлт */
  pagesPerSession: number;
  /** Дундаж сешний үргэлжлэх хугацаа, секундээр */
  avgDuration: number;
};

export type TrafficDay = { date: string; sessions: number; users: number; views: number };
export type TrafficRow = { label: string; sessions: number; users: number };
export type TrafficPage = { path: string; views: number; users: number };

export type TrafficData =
  | { ready: false; reason: "not-configured" | "error"; message?: string }
  | {
      ready: true;
      period: ReportPeriod;
      totals: TrafficTotals;
      byDay: TrafficDay[];
      /** Эх сурвалж — Facebook, Instagram, Google… (traffic-source.ts)  */
      channels: ClassifiedTraffic[];
      devices: TrafficRow[];
      pages: TrafficPage[];
      countries: TrafficRow[];
    };

/** "YYYY-MM-DD" → GA4-ийн хүлээн авдаг хэлбэр (адилхан) */
const ga4Date = (key: string) => key;

export async function getTraffic(period: ReportPeriod): Promise<TrafficData> {
  if (!isGa4Configured()) return { ready: false, reason: "not-configured" };

  const range = { startDate: ga4Date(period.from), endDate: ga4Date(period.to) };

  try {
    const [totalsRows, dayRows, channelRows, deviceRows, pageRows, countryRows] =
      await Promise.all([
        runGa4Report({
          ...range,
          metrics: [
            "activeUsers",
            "newUsers",
            "sessions",
            "screenPageViews",
            "averageSessionDuration",
          ],
        }),
        runGa4Report({
          ...range,
          dimensions: ["date"],
          metrics: ["sessions", "activeUsers", "screenPageViews"],
          orderByDimension: 0,
        }),
        runGa4Report({
          ...range,
          // Бүдүүн бүлэг (sessionDefaultChannelGroup) биш, жинхэнэ
          // эх сурвалж — Facebook, Instagram, Messenger-ийг ялгахын тулд.
          dimensions: ["sessionSource", "sessionMedium"],
          metrics: ["sessions", "activeUsers"],
          orderByMetric: 0,
          limit: 100,
        }),
        runGa4Report({
          ...range,
          dimensions: ["deviceCategory"],
          metrics: ["sessions", "activeUsers"],
          orderByMetric: 0,
        }),
        runGa4Report({
          ...range,
          dimensions: ["pagePath"],
          metrics: ["screenPageViews", "activeUsers"],
          orderByMetric: 0,
          limit: 15,
        }),
        runGa4Report({
          ...range,
          dimensions: ["country"],
          metrics: ["sessions", "activeUsers"],
          orderByMetric: 0,
          limit: 8,
        }),
      ]);

    const t = totalsRows[0]?.metrics ?? [0, 0, 0, 0, 0];
    const [users, newUsers, sessions, pageViews, avgDuration] = t;

    // GA4 огноог "YYYYMMDD" хэлбэрээр буцаадаг
    const dayMap = new Map(
      dayRows.map((r) => {
        const d = r.dims[0];
        return [`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`, r.metrics];
      }),
    );
    // Захиалгагүй өдөр ч мөр болж гарна — график тасрахгүй
    const byDay: TrafficDay[] = periodDayKeys(period).map((date) => {
      const m = dayMap.get(date) ?? [0, 0, 0];
      return { date, sessions: m[0], users: m[1], views: m[2] };
    });

    const asRows = (rows: typeof channelRows): TrafficRow[] =>
      rows.map((r) => ({
        label: r.dims[0] || "—",
        sessions: r.metrics[0],
        users: r.metrics[1],
      }));

    return {
      ready: true,
      period,
      totals: {
        users,
        newUsers,
        sessions,
        pageViews,
        pagesPerSession: sessions > 0 ? pageViews / sessions : 0,
        avgDuration,
      },
      byDay,
      channels: classifyTraffic(
        channelRows.map((r) => ({
          source: r.dims[0],
          medium: r.dims[1],
          sessions: r.metrics[0],
          users: r.metrics[1],
        })),
        // Сешнгүй сувгийг ч харуулна — хүснэгт хугацаа болгонд ижил
        // бүтэцтэй байж, ямар суваг хэмжигдэж байгаа нь харагдана.
        { includeEmpty: true },
      ),
      devices: asRows(deviceRows),
      pages: pageRows.map((r) => ({
        path: r.dims[0] || "/",
        views: r.metrics[0],
        users: r.metrics[1],
      })),
      countries: asRows(countryRows),
    };
  } catch (e) {
    return { ready: false, reason: "error", message: (e as Error).message };
  }
}

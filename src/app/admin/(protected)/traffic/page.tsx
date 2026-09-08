import { TopBar } from "@/components/admin/TopBar";
import { KpiCard } from "@/components/admin/KpiCard";
import { ReportToolbar } from "@/components/admin/ReportToolbar";
import { getTraffic } from "@/lib/queries/traffic";
import { resolvePeriod } from "@/lib/report-period";
import { ubDateKey } from "@/lib/datetime";

export const metadata = { title: "Traffic | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

const num = (n: number) => Math.round(n).toLocaleString("mn-MN");

/** Хугацааг "2 мин 14 сек" болгож бичих */
function duration(sec: number): string {
  const s = Math.round(sec);
  return s < 60 ? `${s} сек` : `${Math.floor(s / 60)} мин ${s % 60} сек`;
}

/** GA4-ийн сувгийн нэрийг монголоор */
const CHANNEL_LABEL: Record<string, string> = {
  "Organic Social": "Сошиал (органик)",
  "Paid Social": "Сошиал (төлбөртэй)",
  "Organic Search": "Хайлт (органик)",
  "Paid Search": "Хайлт (төлбөртэй)",
  Direct: "Шууд орсон",
  Referral: "Бусад сайтаас",
  Email: "И-мэйл",
  "Cross-network": "Сүлжээ хооронд",
  Unassigned: "Тодорхойгүй",
};

const DEVICE_LABEL: Record<string, string> = {
  mobile: "Гар утас",
  desktop: "Компьютер",
  tablet: "Таблет",
};

const TH =
  "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500 whitespace-nowrap";
const TD = "px-3 py-2 text-[13px] text-ink-700";
const TD_NUM = `${TD} text-right tabular-nums whitespace-nowrap`;

export default async function AdminTraffic({
  searchParams,
}: PageProps<"/admin/traffic">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const period = resolvePeriod({
    preset: one(sp.preset),
    from: one(sp.from),
    to: one(sp.to),
  });

  const data = await getTraffic(period);

  if (!data.ready) {
    return (
      <>
        <TopBar title="Traffic" crumb={period.label} />
        <div className="flex-1 space-y-5 p-7">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Сайтын traffic
          </h1>
          <div className="rounded-2xl border-[1.5px] border-[#e89823] bg-[#fdf2dc] p-5">
            <div className="font-display text-[15px] font-extrabold text-[#a3660d]">
              {data.reason === "not-configured"
                ? "GA4 холболт тохируулаагүй байна"
                : "GA4-ээс өгөгдөл авахад алдаа гарлаа"}
            </div>
            <p className="mt-1.5 text-[13px] text-ink-700">
              {data.reason === "not-configured" ? (
                <>
                  <code className="rounded bg-white/70 px-1.5 py-0.5 text-[12px]">
                    GA4_PROPERTY_ID
                  </code>{" "}
                  ба{" "}
                  <code className="rounded bg-white/70 px-1.5 py-0.5 text-[12px]">
                    GA4_SERVICE_ACCOUNT_B64
                  </code>{" "}
                  хувьсагчийг нэмсний дараа энд traffic харагдана.
                </>
              ) : (
                data.message
              )}
            </p>
          </div>
        </div>
      </>
    );
  }

  const { totals, byDay, channels, devices, pages, countries } = data;
  const maxSessions = Math.max(1, ...byDay.map((d) => d.sessions));
  const totalChannelSessions =
    channels.reduce((s, c) => s + c.sessions, 0) || 1;
  const totalDeviceSessions = devices.reduce((s, d) => s + d.sessions, 0) || 1;
  const maxViews = Math.max(1, ...pages.map((p) => p.views));

  return (
    <>
      <TopBar title="Traffic" crumb={period.label} />
      <div className="flex-1 space-y-5 p-7 print:space-y-4 print:p-0">
        {/* ---------- Дэлгэцийн толгой ---------- */}
        <div className="print-hide">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Сайтын traffic
          </h1>
          <div className="mt-0.5 text-[13px] text-ink-500">{period.label}</div>
        </div>

        <ReportToolbar period={period} basePath="/admin/traffic" />

        {/* ---------- Цаасан дээрх толгой ---------- */}
        <div className="print-only mb-4 border-b-2 border-ink-900 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-500">
                Дөрвөн Өлзий ХХК · vidan.mn
              </div>
              <h1 className="font-display mt-1 text-xl font-extrabold text-ink-900">
                Сайтын traffic-ийн тайлан
              </h1>
              <div className="mt-0.5 text-[13px] text-ink-700">
                Хугацаа: <b>{period.label}</b>
              </div>
            </div>
            <div className="text-right text-[11px] text-ink-500">
              <div>Тайлан гаргасан</div>
              <div className="font-bold text-ink-900">{ubDateKey()}</div>
            </div>
          </div>
        </div>

        {/* ---------- KPI ---------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
          <KpiCard label="Хэрэглэгч" value={num(totals.users)} icon="👥" tone="brand" />
          <KpiCard label="Сешн" value={num(totals.sessions)} icon="📈" tone="lime" />
          <KpiCard label="Хуудасны үзэлт" value={num(totals.pageViews)} icon="👁" tone="info" />
          <KpiCard label="Шинэ хэрэглэгч" value={num(totals.newUsers)} icon="✨" tone="warn" />
        </div>

        <div className="print-card print-block grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-200 bg-ink-200 sm:grid-cols-3">
          {[
            { label: "Сешн тутамд хуудас", value: totals.pagesPerSession.toFixed(1) },
            { label: "Дундаж үргэлжлэл", value: duration(totals.avgDuration) },
            {
              label: "Буцаж ирсэн",
              value: `${num(Math.max(0, totals.users - totals.newUsers))} хэрэглэгч`,
            },
          ].map((s) => (
            <div key={s.label} className="bg-white px-5 py-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                {s.label}
              </div>
              <div className="font-display mt-0.5 text-[18px] font-extrabold text-ink-900">
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ---------- Өдрийн динамик ---------- */}
        <div className="print-card print-block rounded-2xl border border-ink-200 bg-white">
          <div className="border-b border-ink-200 px-5 py-4">
            <h3 className="font-display text-[15px] font-extrabold">
              Өдрийн сешн
            </h3>
          </div>
          <div className="p-5">
            {totals.sessions === 0 ? (
              <div className="grid h-[200px] place-items-center text-sm text-ink-500">
                📊 Энэ хугацаанд зочилсон хүн алга
              </div>
            ) : (
              <div className="flex items-end gap-1" style={{ height: 180 }}>
                {byDay.map((d) => (
                  <div
                    key={d.date}
                    className="group relative flex-1"
                    title={`${d.date} · ${d.sessions} сешн · ${d.users} хэрэглэгч`}
                  >
                    <div
                      className="rounded-t-[3px] bg-gradient-to-t from-brand-700 to-brand-500"
                      style={{
                        height: Math.max(2, (d.sessions / maxSessions) * 170),
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex justify-between text-[11px] text-ink-500">
              <span>{byDay[0]?.date}</span>
              <span className="tabular-nums">дээд {num(maxSessions)} сешн</span>
              <span>{byDay[byDay.length - 1]?.date}</span>
            </div>
          </div>
        </div>

        {/* ---------- Эх сурвалж + төхөөрөмж ---------- */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="print-card print-block rounded-2xl border border-ink-200 bg-white">
            <div className="border-b border-ink-200 px-5 py-4">
              <h3 className="font-display text-[15px] font-extrabold">
                Хаанаас ирсэн
              </h3>
              <p className="mt-0.5 text-[12px] text-ink-500">
                Зочид ямар сувгаар орж ирсэн бэ
              </p>
            </div>
            <table className="w-full">
              <thead className="bg-ink-100/60">
                <tr>
                  <th className={TH}>Суваг</th>
                  <th className={`${TH} text-right`}>Сешн</th>
                  <th className={`${TH} text-right`}>Хувь</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => (
                  <tr key={c.label} className="border-t border-ink-100">
                    <td className={`${TD} font-semibold text-ink-900`}>
                      {CHANNEL_LABEL[c.label] ?? c.label}
                    </td>
                    <td className={`${TD_NUM} font-display font-extrabold`}>
                      {num(c.sessions)}
                    </td>
                    <td className={TD_NUM}>
                      {Math.round((c.sessions / totalChannelSessions) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print-card print-block rounded-2xl border border-ink-200 bg-white">
            <div className="border-b border-ink-200 px-5 py-4">
              <h3 className="font-display text-[15px] font-extrabold">
                Төхөөрөмж
              </h3>
              <p className="mt-0.5 text-[12px] text-ink-500">
                Ямар төхөөрөмжөөс үздэг вэ
              </p>
            </div>
            <table className="w-full">
              <thead className="bg-ink-100/60">
                <tr>
                  <th className={TH}>Төхөөрөмж</th>
                  <th className={`${TH} text-right`}>Сешн</th>
                  <th className={`${TH} text-right`}>Хувь</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.label} className="border-t border-ink-100">
                    <td className={`${TD} font-semibold text-ink-900`}>
                      {DEVICE_LABEL[d.label] ?? d.label}
                    </td>
                    <td className={`${TD_NUM} font-display font-extrabold`}>
                      {num(d.sessions)}
                    </td>
                    <td className={TD_NUM}>
                      {Math.round((d.sessions / totalDeviceSessions) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {countries.length > 0 && (
              <>
                <div className="border-t border-ink-200 px-5 py-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    Улс
                  </h4>
                </div>
                <table className="w-full">
                  <tbody>
                    {countries.slice(0, 5).map((c) => (
                      <tr key={c.label} className="border-t border-ink-100">
                        <td className={TD}>{c.label}</td>
                        <td className={`${TD_NUM} font-display font-extrabold`}>
                          {num(c.sessions)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>

        {/* ---------- Топ хуудас ---------- */}
        <div className="print-card rounded-2xl border border-ink-200 bg-white">
          <div className="border-b border-ink-200 px-5 py-4">
            <h3 className="font-display text-[15px] font-extrabold">
              Хамгийн их үзсэн хуудас
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px]">
              <thead className="bg-ink-100/60">
                <tr>
                  <th className={`${TH} w-10`}>№</th>
                  <th className={TH}>Хуудас</th>
                  <th className={`${TH} text-right`}>Үзэлт</th>
                  <th className={`${TH} text-right`}>Хэрэглэгч</th>
                  <th className={`${TH} w-[130px] print:hidden`} />
                </tr>
              </thead>
              <tbody>
                {pages.map((p, i) => (
                  <tr key={p.path} className="border-t border-ink-100">
                    <td className={`${TD} tabular-nums text-ink-500`}>{i + 1}</td>
                    <td className={`${TD} font-semibold text-ink-900`}>{p.path}</td>
                    <td className={`${TD_NUM} font-display font-extrabold`}>
                      {num(p.views)}
                    </td>
                    <td className={TD_NUM}>{num(p.users)}</td>
                    <td className="px-3 py-2 print:hidden">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
                          style={{ width: `${Math.max(4, (p.views / maxViews) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="print-hide text-[12px] text-ink-500">
          Эх сурвалж: Google Analytics 4 · property {process.env.GA4_PROPERTY_ID}.
          Тоо GA4-д 24–48 цагийн дотор эцэслэн тодордог тул өнөөдрийнх өөрчлөгдөж болно.
        </p>
      </div>
    </>
  );
}

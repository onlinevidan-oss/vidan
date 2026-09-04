import Image from "next/image";
import { TopBar } from "@/components/admin/TopBar";
import { ReportToolbar } from "@/components/admin/ReportToolbar";
import { getInventory } from "@/lib/queries/inventory";
import { PERIOD_PRESETS, resolvePeriod } from "@/lib/report-period";
import { ubDateKey } from "@/lib/datetime";
import { formatMnt } from "@/lib/utils";

export const metadata = { title: "Агуулахын үлдэгдэл | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

const qty = (n: number) => n.toLocaleString("mn-MN");

const TH = "px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500 whitespace-nowrap";
const TD = "px-3 py-2.5 text-[13px] text-ink-700";
const TD_NUM = `${TD} text-right tabular-nums whitespace-nowrap`;

export default async function AdminInventory({
  searchParams,
}: PageProps<"/admin/inventory">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  // Агуулахын хуудсанд өгөгдмөл нь "Бүх хугацаа" — зарлага нь нийт
  // зарагдсан тоог харуулах нь агуулахын хувьд утга учиртай.
  const period = resolvePeriod({
    preset: one(sp.preset) ?? "all",
    from: one(sp.from),
    to: one(sp.to),
  });

  const { rows, totals } = await getInventory(period);

  const stats = [
    { label: "Нэр төрөл", value: `${totals.skuCount}` },
    { label: "Нийт үлдэгдэл", value: `${qty(totals.units)} ш` },
    { label: "Үлдэгдлийн дүн", value: formatMnt(totals.value) },
    { label: "Нийт зарлага", value: `${qty(totals.sold)} ш` },
    { label: "Дуусах дөхсөн", value: `${totals.lowCount} нэр` },
    { label: "Дууссан", value: `${totals.outCount} нэр` },
  ];

  return (
    <>
      <TopBar title="Агуулах" crumb={period.label} />
      <div className="flex-1 space-y-5 p-7 print:space-y-4 print:p-0">
        {/* ---------- Дэлгэцийн толгой ---------- */}
        <div className="print-hide">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Агуулахын үлдэгдэл
          </h1>
          <div className="mt-0.5 text-[13px] text-ink-500">
            Зарлага: {period.label}
          </div>
        </div>

        <ReportToolbar
          period={period}
          basePath="/admin/inventory"
          presets={PERIOD_PRESETS}
        />

        {/* ---------- Цаасан дээрх толгой ---------- */}
        <div className="print-only mb-4 border-b-2 border-ink-900 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-500">
                Дөрвөн Өлзий ХХК · VIDAN
              </div>
              <h1 className="font-display mt-1 text-xl font-extrabold text-ink-900">
                Агуулахын үлдэгдэл
              </h1>
              <div className="mt-0.5 text-[13px] text-ink-700">
                Зарлагын хугацаа: <b>{period.label}</b>
              </div>
            </div>
            <div className="text-right text-[11px] text-ink-500">
              <div>Тайлан гаргасан</div>
              <div className="font-bold text-ink-900">{ubDateKey()}</div>
            </div>
          </div>
        </div>

        {/* ---------- Хураангуй ---------- */}
        <div className="print-card print-block grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-200 bg-ink-200 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="bg-white px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                {s.label}
              </div>
              <div className="font-display mt-0.5 text-[18px] font-extrabold text-ink-900">
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ---------- Жагсаалт ---------- */}
        <div className="print-card overflow-hidden rounded-2xl border border-ink-200 bg-white">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-500">
              Идэвхтэй бүтээгдэхүүн алга
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-ink-100/60">
                  <tr>
                    <th className={`${TH} w-12`}>№</th>
                    <th className={TH} colSpan={2}>
                      Бүтээгдэхүүн
                    </th>
                    <th className={TH}>Ангилал</th>
                    <th className={`${TH} text-right`}>Үлдэгдэл</th>
                    <th className={`${TH} text-right`}>Зарлага</th>
                    <th className={`${TH} text-right`}>Нэгж үнэ</th>
                    <th className={`${TH} text-right`}>Дүн</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r.id}
                      className="border-t border-ink-100 even:bg-ink-100/25"
                    >
                      <td className={`${TD} tabular-nums text-ink-500`}>{i + 1}</td>
                      <td className="py-2 pl-3 pr-0">
                        <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-ink-200 bg-white">
                          {r.imageUrl ? (
                            <Image
                              src={r.imageUrl}
                              alt=""
                              width={44}
                              height={44}
                              className="h-full w-full object-contain"
                              unoptimized
                              // Хэвлэхэд бүх зураг бэлэн байх ёстой — lazy бол
                              // доод мөрүүдийн зураг цаасан дээр хоосон гарна
                              loading="eager"
                            />
                          ) : (
                            <span className="text-base">🫙</span>
                          )}
                        </div>
                      </td>
                      <td className={`${TD} font-semibold text-ink-900`}>
                        {r.name}
                        <div className="text-[11px] font-normal text-ink-500">
                          {r.sku}
                        </div>
                      </td>
                      <td className={`${TD} text-[12px] text-ink-500`}>
                        {r.category}
                      </td>
                      <td className={`${TD_NUM} font-display text-[15px] font-extrabold`}>
                        <span
                          className={
                            r.out
                              ? "text-brand-600"
                              : r.low
                                ? "text-[#a3660d]"
                                : "text-ink-900"
                          }
                        >
                          {qty(r.stock)}
                        </span>
                        {r.out && (
                          <div className="text-[10px] font-bold text-brand-600">
                            ДУУССАН
                          </div>
                        )}
                        {r.low && (
                          <div className="text-[10px] font-bold text-[#a3660d]">
                            ДУУСАХ ДӨХСӨН
                          </div>
                        )}
                      </td>
                      <td className={`${TD_NUM} font-display text-[15px] font-extrabold text-ink-900`}>
                        {r.sold > 0 ? qty(r.sold) : <span className="text-ink-300">0</span>}
                      </td>
                      <td className={TD_NUM}>{formatMnt(r.price)}</td>
                      <td className={`${TD_NUM} font-display font-extrabold text-ink-900`}>
                        {formatMnt(r.value)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-ink-200 bg-ink-100/60">
                    <td className={TD} colSpan={3}>
                      <span className="font-display font-extrabold text-ink-900">
                        НИЙТ
                      </span>
                    </td>
                    <td className={TD} />
                    <td className={`${TD_NUM} font-display text-[15px] font-black text-ink-900`}>
                      {qty(totals.units)}
                    </td>
                    <td className={`${TD_NUM} font-display text-[15px] font-black text-ink-900`}>
                      {qty(totals.sold)}
                    </td>
                    <td className={TD} />
                    <td className={`${TD_NUM} font-display font-black text-ink-900`}>
                      {formatMnt(totals.value)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="print-hide text-[12px] text-ink-500">
          Үлдэгдэл цөөрснөөр эрэмбэлэгдсэн — дуусах дөхсөн бараа эхэнд.
          Зарлага нь сонгосон хугацаанд төлбөр төлөгдсөн захиалгаар зарагдсан тоо.
        </p>

        {/* ---------- Гарын үсэг (зөвхөн цаасан дээр) ---------- */}
        <div className="print-only pt-8">
          <div className="flex justify-between gap-12 text-[12px] text-ink-700">
            <div className="flex-1">
              <div className="mb-8">Тооллого хийсэн:</div>
              <div className="border-t border-ink-900 pt-1 text-ink-500">
                нэр, гарын үсэг
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-8">Хүлээн авсан (санхүү):</div>
              <div className="border-t border-ink-900 pt-1 text-ink-500">
                нэр, гарын үсэг
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

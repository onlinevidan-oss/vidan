import { TopBar } from "./TopBar";

export function StubPage({
  title,
  crumb,
  emoji,
  description,
  phase,
}: {
  title: string;
  crumb?: string;
  emoji: string;
  description: string;
  phase: string;
}) {
  return (
    <>
      <TopBar title={title} crumb={crumb} />
      <div className="grid flex-1 place-items-center p-7">
        <div className="max-w-[460px] rounded-2xl border border-ink-200 bg-white p-10 text-center shadow-[var(--shadow-brand-sm)]">
          <div className="mb-4 text-5xl">{emoji}</div>
          <h2 className="font-display mb-2 text-xl font-extrabold tracking-tight text-ink-900">
            {title}
          </h2>
          <p className="mb-5 text-sm text-ink-700">{description}</p>
          <div className="inline-flex items-center gap-2 rounded-full bg-lime-100 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-lime-700">
            🚧 {phase}-д бүтээгдэнэ
          </div>
        </div>
      </div>
    </>
  );
}

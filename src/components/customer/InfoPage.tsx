import Link from "next/link";

export function InfoPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <article className="my-8 mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-3 flex gap-2 text-xs text-ink-500">
        <Link href="/">Нүүр</Link><span>/</span><span>{title}</span>
      </nav>
      <header className="rounded-2xl bg-white p-6 md:p-9">
        <h1 className="font-display text-3xl font-black text-ink-900">{title}</h1>
        <p className="mt-3 leading-relaxed text-ink-700">{intro}</p>
      </header>
      <div className="mt-6 space-y-6 rounded-2xl border border-ink-200 bg-white p-6 leading-relaxed text-ink-700 md:p-9 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-ink-900 [&_h3]:font-bold [&_h3]:text-ink-900 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}

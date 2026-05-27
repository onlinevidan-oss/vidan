import { Header } from "@/components/customer/Header";
import { Footer } from "@/components/customer/Footer";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="bg-brand-700 px-5 py-2 text-center text-[13px] text-white">
        🚚 50,000₮-с дээш захиалгад{" "}
        <strong className="text-lime-500">ҮНЭГҮЙ ХҮРГЭЛТ</strong> · Улаанбаатар
        хотод 2 цагт хүрнэ
      </div>
      <Header />
      <main className="mx-auto w-full max-w-[1240px] px-5 flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}

import Image from "next/image";
import Link from "next/link";

export function Logo({
  height = 48,
  href = "/",
}: {
  height?: number;
  href?: string;
}) {
  return (
    <Link href={href} className="inline-flex items-center">
      <Image
        src="/vidan-logo.png"
        alt="VIDAN"
        width={Math.round(height * (630 / 282))}
        height={height}
        priority
      />
    </Link>
  );
}

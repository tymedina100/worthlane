import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = { className?: string; label?: string };

export function BrandMark({ className, label }: BrandMarkProps) {
  return <Image src="/brand/worthlane-symbol.png" alt={label ?? ""} aria-hidden={label ? undefined : true} className={className} width={500} height={500} />;
}

export function BrandLockup() {
  return <Link href="/" className="brand-lockup" aria-label="Worthlane home"><Image src="/brand/worthlane-horizontal-lockup.png" alt="Worthlane" className="brand-lockup__image" width={866} height={288} priority /></Link>;
}

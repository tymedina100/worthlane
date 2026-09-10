import Link from "next/link";

export function BrandMark({ className = "", label }: { className?: string; label?: string }) {
  return <svg className={`brand-mark ${className}`} viewBox="0 0 48 48" fill="none" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}><path d="M6 13l9 23 9-17 9 17 9-23" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 9h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>;
}
export function BrandLockup() { return <Link href="/" className="brand-lockup" aria-label="Worthlane home"><BrandMark /><span>worthlane</span></Link>; }

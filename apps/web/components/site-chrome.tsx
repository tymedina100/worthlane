"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { BrandLockup } from "./brand";

export function LegalHeader() {
  const menuButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return <><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><nav className="site-container site-nav" aria-label="Main navigation"><BrandLockup /><button ref={menuButton} className="menu-toggle" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</button><div id="site-menu" className={`nav-links ${open ? "is-open" : ""}`} onKeyDown={e => { if (e.key === "Escape") { setOpen(false); menuButton.current?.focus(); } }}><Link href="/#how-it-works" onClick={() => setOpen(false)}>The idea</Link><Link href="/#your-plan" onClick={() => setOpen(false)}>Try a split</Link><Link href="/support" onClick={() => setOpen(false)}>Support</Link><Link className="button button--small" href="/#beta" onClick={() => setOpen(false)}>Join the beta <span aria-hidden="true">↗</span></Link></div></nav></header></>;
}
export function SiteFooter() {
  return <footer className="site-footer"><div className="site-container"><div className="footer-top"><div><BrandLockup /><p>Make room for life together.</p></div><nav aria-label="Footer navigation"><Link href="/">Home</Link><Link href="/support">Support</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav></div><div className="footer-bottom"><p>© {new Date().getFullYear()} Worthlane</p><p>Thoughtful money planning. Built for real life.</p></div></div></footer>;
}

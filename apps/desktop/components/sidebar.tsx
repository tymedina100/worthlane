"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, WorthlaneMark } from "./icons";

type SidebarProps = {
  householdName?: string;
  viewerName?: string;
  partnerName?: string;
  demo?: boolean;
};

const navItems = [
  { label: "Overview", path: "", demoAnchor: "#overview", icon: "dashboard" as const, shortcut: "1" },
  { label: "Monthly plan", path: "/plan", demoAnchor: "#responsibilities", icon: "plan" as const, shortcut: "2" },
  { label: "Accounts & privacy", path: "/accounts", demoAnchor: "#accounts", icon: "accounts" as const, shortcut: "3" },
  { label: "Shared goals", path: "/goals", demoAnchor: "#goals", icon: "goal" as const, shortcut: "4" },
  { label: "Reports", path: "/reports", demoAnchor: null, icon: "report" as const, shortcut: "5" },
];

export function Sidebar({
  householdName = "Your household",
  viewerName = "You",
  partnerName,
  demo = false,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeDemoAnchor, setActiveDemoAnchor] = useState("#overview");
  const workspaceRoot = demo ? "/demo" : "/dashboard";
  const initials = viewerName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!demo) return;
    const syncActiveAnchor = () => setActiveDemoAnchor(window.location.hash || "#overview");
    syncActiveAnchor();
    window.addEventListener("hashchange", syncActiveAnchor);
    return () => window.removeEventListener("hashchange", syncActiveAnchor);
  }, [demo]);

  useEffect(() => {
    function navigateWithShortcut(event: KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.matches("input, textarea, select, [role='textbox']"))
      ) {
        return;
      }
      const item = navItems.find((candidate) => candidate.shortcut === event.key);
      if (!item || (demo && !item.demoAnchor)) return;

      event.preventDefault();
      router.push(demo ? `${workspaceRoot}${item.demoAnchor}` : `${workspaceRoot}${item.path}`);
    }

    window.addEventListener("keydown", navigateWithShortcut);
    return () => window.removeEventListener("keydown", navigateWithShortcut);
  }, [router, workspaceRoot]);

  async function signOut() {
    if (demo) {
      router.push("/login");
      return;
    }

    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <Link className="sidebar__brand" href={workspaceRoot}>
        <span className="sidebar__mark">
          <WorthlaneMark />
        </span>
        <span>worthlane</span>
      </Link>

      <div className="sidebar__household">
        <span className="sidebar__eyebrow">Household</span>
        <strong>{householdName}</strong>
        <span>{partnerName ? `${viewerName} + ${partnerName}` : viewerName}</span>
      </div>

      <nav className="sidebar__nav">
        <span className="sidebar__eyebrow">Workspace</span>
        {navItems.map((item) => {
          const href = demo ? `${workspaceRoot}${item.demoAnchor ?? ""}` : `${workspaceRoot}${item.path}`;
          const isActive = demo
            ? item.demoAnchor === activeDemoAnchor
            : item.path
              ? pathname === href
              : pathname === workspaceRoot;
          if (demo && !item.demoAnchor) {
            return (
              <span
                className="sidebar__nav-item is-muted"
                key={item.label}
                role="link"
                aria-disabled="true"
                aria-label="Reports (sign in required)"
                title="Sign in to use reports"
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                <kbd>Sign in</kbd>
              </span>
            );
          }
          return (
          <Link
            className={`sidebar__nav-item${isActive ? " is-active" : ""}`}
            href={href}
            key={item.label}
            aria-current={isActive ? "page" : undefined}
            title={`${item.label} (Alt+${item.shortcut})`}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            <kbd>Alt+{item.shortcut}</kbd>
          </Link>
          );
        })}
      </nav>

      <div className="sidebar__privacy">
        <Icon name="shield" />
        <div>
          <strong>Privacy stays personal</strong>
          <span>You decide what your partner sees.</span>
        </div>
      </div>

      <div className="sidebar__profile">
        <span className="sidebar__avatar" aria-hidden="true">
          {initials}
        </span>
        <div>
          <strong>{viewerName}</strong>
          <span>{demo ? "Demo preview" : "Household member"}</span>
        </div>
        <button
          type="button"
          className="sidebar__signout"
          onClick={signOut}
          disabled={isSigningOut}
          aria-label={demo ? "Exit demo" : "Sign out"}
          title={demo ? "Exit demo" : "Sign out"}
        >
          <Icon name="arrow" />
        </button>
      </div>
    </aside>
  );
}

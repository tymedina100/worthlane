"use client";

import { track } from "@vercel/analytics";

type AnalyticsLinkProps = {
  event: string;
  eventLocation: string;
  href: string;
  className?: string;
  target?: string;
  rel?: string;
  children: any;
};

export function AnalyticsLink({ event, eventLocation, ...props }: AnalyticsLinkProps) {
  return <a {...props} onClick={() => track(event, { location: eventLocation })} />;
}

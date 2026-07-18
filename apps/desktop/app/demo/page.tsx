import type { Metadata } from "next";
import { HouseholdDashboard } from "../../components/household-dashboard";
import { demoHouseholdSummary } from "../../src/lib/demo-household";

export const metadata: Metadata = {
  title: "Interactive demo",
};

export default function DemoPage() {
  return <HouseholdDashboard mode="demo" initialSummary={demoHouseholdSummary} />;
}

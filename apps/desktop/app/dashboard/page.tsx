import type { Metadata } from "next";
import { HouseholdDashboard } from "../../components/household-dashboard";

export const metadata: Metadata = {
  title: "Household dashboard",
};

export default function DashboardPage() {
  return <HouseholdDashboard mode="live" />;
}

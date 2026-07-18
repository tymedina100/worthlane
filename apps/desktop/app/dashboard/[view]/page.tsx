import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspacePage } from "../../../components/workspace-page";
import type { WorkspaceView } from "../../../components/workspace-surfaces";

const views: Record<WorkspaceView, { title: string }> = {
  plan: { title: "Monthly plan" },
  accounts: { title: "Accounts & privacy" },
  goals: { title: "Shared goals" },
  reports: { title: "Reports" },
};

function isWorkspaceView(value: string): value is WorkspaceView {
  return value in views;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ view: string }>;
}): Promise<Metadata> {
  const { view } = await params;
  return { title: isWorkspaceView(view) ? views[view].title : "Workspace" };
}

export default async function PlanningWorkspacePage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!isWorkspaceView(view)) notFound();
  return <WorkspacePage view={view} />;
}

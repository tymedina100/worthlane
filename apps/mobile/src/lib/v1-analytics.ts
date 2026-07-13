import { isPostHogEnabled, posthog } from "@/lib/posthog";

export type V1Event =
  | "onboarding_completed"
  | "manual_account_created"
  | "quick_add_opened"
  | "manual_transaction_created"
  | "upcoming_item_created"
  | "upcoming_item_marked_paid"
  | "reminder_enabled"
  | "feature_suggestion_opened"
  | "feature_suggestion_submitted";

/** Never pass financial values, names, notes, or account information here. */
export function captureV1Event(event: V1Event) {
  if (isPostHogEnabled) posthog.capture(event);
}

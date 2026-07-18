import { captureServerException } from "@/lib/sentry";
import { err, notFound } from "@/lib/response";
import {
  HouseholdConflictError,
  HouseholdForbiddenError,
  HouseholdNotFoundError,
  HouseholdValidationError,
} from "@/lib/household";

export function householdErrorResponse(
  error: unknown,
  route: string,
  fallbackMessage: string,
  fallbackCode: string
) {
  if (error instanceof HouseholdNotFoundError) {
    return notFound(error.message);
  }
  if (error instanceof HouseholdForbiddenError) {
    return err(error.message, 403, "HOUSEHOLD_FORBIDDEN");
  }
  if (error instanceof HouseholdValidationError) {
    return err(error.message, 400, "HOUSEHOLD_VALIDATION_FAILED");
  }
  if (error instanceof HouseholdConflictError) {
    return err(error.message, 409, "HOUSEHOLD_CONFLICT");
  }
  captureServerException(error, { tags: { route } });
  return err(fallbackMessage, 500, fallbackCode);
}

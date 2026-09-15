import { describe, expect, it } from "vitest";
import { plaidExitError } from "../../mobile/src/lib/plaid-exit";

describe("native Plaid exit payloads", () => {
  it("treats the iOS v13 empty error dictionary and missing errors as cancellation", () => {
    for (const error of [undefined, null, {}, { errorCode: "", displayMessage: " ", errorMessage: "" }]) {
      expect(plaidExitError(error)).toBeNull();
    }
  });
  it("retains real failures and skips the SDK's empty display message", () => {
    expect(plaidExitError({ errorCode: "ITEM_LOGIN_REQUIRED", displayMessage: "", errorMessage: "Reconnect your bank." }))
      .toEqual({ code: "ITEM_LOGIN_REQUIRED", message: "Reconnect your bank." });
    expect(plaidExitError({ displayMessage: "Try another bank.", errorMessage: "Internal detail" }))
      .toEqual({ message: "Try another bank." });
    expect(plaidExitError({ errorCode: "UNKNOWN" }))
      .toEqual({ code: "UNKNOWN", message: "Bank linking could not finish. Please try again." });
  });
});

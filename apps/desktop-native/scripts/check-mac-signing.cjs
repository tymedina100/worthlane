"use strict";

function checkMacSigning(env) {
  if (!/^Developer ID Application: .+\(.+\)$/.test(env.CSC_NAME || "")) {
    throw new Error("Set CSC_NAME to the explicitly selected Worthlane Developer ID Application identity before Mac distribution. Local ad-hoc builds use pack:mac:local.");
  }
}
if (require.main === module) checkMacSigning(process.env);
module.exports = { checkMacSigning };

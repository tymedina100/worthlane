import { passwordRecoveryRequest } from "@/src/lib/password-recovery";

export function POST(request: Request) {
  return passwordRecoveryRequest(request, "reset-password");
}

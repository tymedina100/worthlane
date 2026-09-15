import type { ErrorEvent } from "@sentry/nextjs";

// Reconstruct an allowlisted event. A denylist cannot anticipate credentials or
// financial records added to Axios errors, request context, breadcrumbs or tags.
export function privateDiagnosticEvent(event: ErrorEvent): ErrorEvent {
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: "node",
    level: "error",
    release: event.release,
    environment: event.environment,
    exception: {
      values: (event.exception?.values ?? [{}]).slice(0, 3).map(exception => ({
        type: "Error",
        value: "Worthlane server error (details withheld)",
        stacktrace: {
          frames: (exception.stacktrace?.frames ?? []).flatMap(frame => {
            // Retain only recognizable application source locations, never
            // request URLs, local home paths, source excerpts or frame locals.
            const source = frame.filename?.match(/(?:^|\/)src\/((?:app|lib)\/[A-Za-z0-9_./()[\]-]+\.(?:ts|tsx|js|jsx))$/)?.[1];
            if (!source) return [];
            return [{ filename: `src/${source}`, in_app: true,
              lineno: frame.lineno, colno: frame.colno }];
          }),
        },
      })),
    },
  };
}

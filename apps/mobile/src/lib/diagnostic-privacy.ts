import type { ErrorEvent } from "@sentry/react-native";

// Financial apps must not forward arbitrary exception messages or automatically
// captured navigation/network context. Keep only bundle positions for debugging.
export function privateMobileDiagnosticEvent(event: ErrorEvent): ErrorEvent {
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    level: "error",
    platform: "javascript",
    release: event.release,
    dist: event.dist,
    environment: event.environment,
    exception: { values: (event.exception?.values ?? [{}]).slice(0, 3).map(error => ({
      type: "Error",
      value: "Worthlane app error (details withheld)",
      stacktrace: { frames: (error.stacktrace?.frames ?? []).flatMap(frame => {
        const name = frame.filename?.split("/").pop();
        if (!name || !/^(?:index\.(?:android|ios)\.bundle|main\.jsbundle|index\.bundle)$/.test(name)) return [];
        return [{ filename: `app:///${name}`, lineno: frame.lineno, colno: frame.colno, in_app: true }];
      }) },
    })) },
  };
}

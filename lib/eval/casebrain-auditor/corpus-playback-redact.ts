import { redactForTraining } from "./redaction";

const MAX_SNIPPET = 200;

/** Redact pilot-visible snippet for playback reports (not training export). */
export function redactPlaybackSnippet(text: string): string {
  return redactForTraining(text.slice(0, MAX_SNIPPET), "full-960").text;
}

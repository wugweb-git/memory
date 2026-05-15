/**
 * Layer 4 — Style Enforcement Engine
 * Modifies generated outputs to align with user style.
 * Rules: avoid passive tone, preserve directness, preserve structure, preserve formatting.
 * Does NOT impersonate blindly. Uses confidence thresholds.
 */

import type { StyleEnforcementInput, StyleEnforcementResult } from "./types";

const PASSIVE_REGEX = /\b(was|were|is|are|been|being)\s+\w+ed\b/gi;
const FILLER_PHRASES = ["in order to", "due to the fact that", "at this point in time", "for all intents and purposes"];

export function enforcePersonaStyle(input: StyleEnforcementInput): StyleEnforcementResult {
  const confidence = input.confidence ?? 0.5;
  const changes: string[] = [];

  // Gate: do not enforce if confidence is too low
  if (confidence < 0.55) {
    return { content: input.content, applied: false, reason: "low_confidence", changes };
  }

  let output = input.content;

  // Rule 1: Reduce passive voice
  const passiveMatches = output.match(PASSIVE_REGEX);
  if (passiveMatches && passiveMatches.length > 0) {
    output = output.replace(PASSIVE_REGEX, (match) => {
      const verb = match.replace(/\b(was|were|is|are|been|being)\s+/i, "");
      return verb;
    });
    changes.push(`removed_${passiveMatches.length}_passive_constructions`);
  }

  // Rule 2: Collapse excessive whitespace
  if (output.match(/\n{3,}/)) {
    output = output.replace(/\n{3,}/g, "\n\n").trim();
    changes.push("collapsed_whitespace");
  }

  // Rule 3: Verbosity control
  if (input.style?.verbosity === "short") {
    const lines = output.split("\n").map((p) => p.trim()).filter(Boolean);
    const before = lines.length;
    output = lines.slice(0, 6).join("\n");
    if (before > 6) changes.push(`truncated_from_${before}_to_6_lines`);
  }

  // Rule 4: Structure enforcement
  if (input.style?.structure === "bulleted" && !output.match(/^\s*[-*]\s/m)) {
    const items = output.split(/[\n.]+/).map((s) => s.trim()).filter(Boolean);
    output = items.map((s) => `- ${s}`).join("\n");
    changes.push("converted_to_bullets");
  }

  // Rule 5: Directness boost (trim filler)
  if ((input.style?.directness ?? 0) > 0.7) {
    const before = output.length;
    FILLER_PHRASES.forEach((phrase) => {
      output = output.replace(new RegExp(phrase, "gi"), "");
    });
    output = output.replace(/\s{2,}/g, " ").trim();
    if (output.length < before) changes.push("trimmed_filler_phrases");
  }

  return {
    content: output,
    applied: changes.length > 0,
    reason: changes.length > 0 ? "style_enforced" : "no_changes_needed",
    changes,
  };
}

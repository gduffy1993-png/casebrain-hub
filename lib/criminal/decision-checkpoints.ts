/**
 * Solicitor Decision Moment Prompts
 * 
 * Explicit "Solicitor Decision Required" checkpoints.
 * System STOPS and presents options, risks, consequences.
 * 
 * NEVER auto-decides. Guides, not replaces, solicitor judgment.
 */

import type { RouteType } from "./strategy-fight-types";

export type DecisionCheckpoint = {
  id: string;
  title: string;
  description: string;
  timing: "before_ptph" | "after_disclosure" | "before_trial" | "anytime";
  options: DecisionOption[];
  currentLeverage: "high" | "medium" | "low";
  leverageImpact: {
    option: string;
    impact: "gains" | "loses" | "maintains";
    explanation: string;
  }[];
  solicitorGuidance: string;
};

export type DecisionOption = {
  id: string;
  label: string;
  risks: string[];
  consequences: string[];
  leverage: "gains" | "loses" | "maintains";
  timing: "now" | "later" | "never";
};

/**
 * Generate decision checkpoints for a route
 */
export function generateDecisionCheckpoints(
  route: RouteType,
  hasDisclosureGaps: boolean,
  hasPACEIssues: boolean,
  ptphApproaching: boolean
): DecisionCheckpoint[] {
  const checkpoints: DecisionCheckpoint[] = [];

  switch (route) {
    case "fight_charge":
      // Checkpoint: Apply for stay vs wait
      if (hasDisclosureGaps) {
        checkpoints.push({
          id: "disclosure_stay",
          title: "Apply for Stay vs Wait for Disclosure",
          description: "Disclosure gaps exist. Decision required: apply for stay now or wait for disclosure to complete.",
          timing: "after_disclosure",
          options: [
            {
              id: "apply_stay",
              label: "Apply for stay of proceedings",
              risks: [
                "Application may be premature without proper chase trail",
                "Court may dismiss if chase trail is insufficient",
                "May irritate court if application is weak",
              ],
              consequences: [
                "If successful: proceedings stayed, prosecution case collapses",
                "If unsuccessful: disclosure continues, may weaken future applications",
                "Judicial optics: risky if without chase trail, neutral if with proper trail",
              ],
              leverage: "gains",
              timing: "now",
            },
            {
              id: "wait_disclosure",
              label: "Wait for disclosure to complete",
              risks: [
                "Disclosure may strengthen prosecution case",
                "Leverage window may close",
                "May miss opportunity for stay if failures persist",
              ],
              consequences: [
                "Full disclosure allows complete case assessment",
                "If disclosure remains incomplete, can apply later with stronger case",
                "Preserves judicial optics by showing patience",
              ],
              leverage: "maintains",
              timing: "later",
            },
          ],
          currentLeverage: hasDisclosureGaps ? "high" : "medium",
          leverageImpact: [
            {
              option: "apply_stay",
              impact: "gains",
              explanation: "Applying for stay now gains leverage if successful, but risks judicial optics if premature",
            },
            {
              option: "wait_disclosure",
              impact: "maintains",
              explanation: "Waiting maintains leverage and preserves judicial optics, but may lose window if disclosure completes",
            },
          ],
          solicitorGuidance: "Assess chase trail quality. If chase trail is strong and failures persist, stay application may be viable. If chase trail is weak, wait and document further. Consider judicial optics - premature applications irritate courts.",
        });
      }

      // Checkpoint: Challenge identification vs accept
      checkpoints.push({
        id: "id_challenge",
        title: "Challenge Identification vs Accept",
        description: "Decision required: challenge identification evidence under Turnbull or accept and focus on other angles.",
        timing: "before_ptph",
        options: [
          {
            id: "challenge_id",
            label: "Challenge identification under Turnbull",
            risks: [
              "Challenge may fail if identification is strong",
              "May waste time and resources if identification is reliable",
              "Late challenge may irritate court",
            ],
            consequences: [
              "If successful: identification excluded, prosecution case weakened",
              "If unsuccessful: identification admitted, challenge resources wasted",
              "Judicial optics: attractive if early with proper basis, risky if late or weak",
            ],
            leverage: "gains",
            timing: "now",
          },
          {
            id: "accept_id",
            label: "Accept identification, focus on other angles",
            risks: [
              "May miss opportunity to challenge weak identification",
              "Prosecution case may be stronger if identification is accepted",
            ],
            consequences: [
              "Focuses resources on other defence angles",
              "Preserves judicial optics by not pursuing weak challenges",
              "May lose leverage if identification was actually challengeable",
            ],
            leverage: "maintains",
            timing: "never",
          },
        ],
        currentLeverage: "medium",
        leverageImpact: [
          {
            option: "challenge_id",
            impact: "gains",
            explanation: "Challenging identification gains leverage if successful, but risks resources if weak",
          },
          {
            option: "accept_id",
            impact: "maintains",
            explanation: "Accepting identification maintains current position, but may lose opportunity",
          },
        ],
        solicitorGuidance: "Assess identification strength and Turnbull compliance. If identification is weak or non-compliant, challenge is viable. If identification is strong, focus resources elsewhere. Consider timing - early challenges are more judicially attractive.",
      });
      break;

    case "charge_reduction":
      // Checkpoint: Concede s20 vs push s18
      checkpoints.push({
        id: "charge_negotiation",
        title: "Concede s20 vs Push s18 Challenge",
        description: "Decision required: negotiate s20 plea now or continue challenging s18 charge.",
        timing: "before_ptph",
        options: [
          {
            id: "concede_s20",
            label: "Negotiate s20 plea",
            risks: [
              "May accept higher sentence than necessary if s18 challenge could succeed",
              "Loses opportunity for acquittal",
            ],
            consequences: [
              "Reduced charge from s18 to s20",
              "Lower sentence range",
              "Early resolution saves time and costs",
              "Judicial optics: attractive if negotiated before PTPH",
            ],
            leverage: ptphApproaching ? "gains" : "maintains",
            timing: ptphApproaching ? "now" : "later",
          },
          {
            id: "push_s18",
            label: "Continue challenging s18",
            risks: [
              "May fail if intent evidence is strong",
              "May result in s18 conviction with higher sentence",
              "Loses negotiation leverage if challenge fails",
            ],
            consequences: [
              "If successful: charge reduced or acquitted",
              "If unsuccessful: s18 conviction, higher sentence",
              "Preserves acquittal opportunity",
            ],
            leverage: "maintains",
            timing: "now",
          },
        ],
        currentLeverage: ptphApproaching ? "high" : "medium",
        leverageImpact: [
          {
            option: "concede_s20",
            impact: ptphApproaching ? "gains" : "maintains",
            explanation: ptphApproaching 
              ? "Negotiating before PTPH gains leverage and preserves judicial optics"
              : "Negotiating maintains position but may lose leverage if done too early",
          },
          {
            option: "push_s18",
            impact: "maintains",
            explanation: "Continuing challenge maintains acquittal opportunity but risks higher sentence if fails",
          },
        ],
        solicitorGuidance: "Assess intent evidence strength. If medical/CCTV evidence clearly supports s20, negotiate before PTPH. If intent evidence is ambiguous, consider continuing challenge. Timing is critical - negotiation before PTPH is more judicially attractive.",
      });
      break;

    case "outcome_management":
      // Checkpoint: Early plea vs hold position
      checkpoints.push({
        id: "early_plea",
        title: "Early Plea vs Hold Position",
        description: "Decision required: enter early guilty plea for maximum credit or hold position pending further disclosure.",
        timing: "before_ptph",
        options: [
          {
            id: "early_plea",
            label: "Enter early guilty plea",
            risks: [
              "May plead guilty to strong case unnecessarily if disclosure reveals weaknesses",
              "Loses opportunity for acquittal if case is weak",
              "Cannot withdraw plea easily",
            ],
            consequences: [
              "Maximum sentence reduction (up to 1/3)",
              "Early resolution saves time and costs",
              "Judicial optics: attractive if case is strong",
              "Loses leverage if case is actually weak",
            ],
            leverage: "gains",
            timing: "now",
          },
          {
            id: "hold_position",
            label: "Hold position, await disclosure",
            risks: [
              "May lose plea credit if plea is entered later",
              "Case may strengthen with disclosure",
            ],
            consequences: [
              "Allows full case assessment",
              "Preserves acquittal opportunity if case is weak",
              "May lose plea credit window",
            ],
            leverage: "maintains",
            timing: "later",
          },
        ],
        currentLeverage: "medium",
        leverageImpact: [
          {
            option: "early_plea",
            impact: "gains",
            explanation: "Early plea gains maximum sentence credit, but loses acquittal opportunity",
          },
          {
            option: "hold_position",
            impact: "maintains",
            explanation: "Holding position maintains acquittal opportunity but may lose plea credit",
          },
        ],
        solicitorGuidance: "Assess prosecution case strength realistically. If case is strong and disclosure is complete, early plea may be appropriate. If case is weak or disclosure is incomplete, hold position. Never plead guilty to a weak case - assess disclosure first.",
      });
      break;
  }

  return checkpoints;
}


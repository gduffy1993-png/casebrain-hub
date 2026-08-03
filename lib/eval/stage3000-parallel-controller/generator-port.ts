/**
 * Generator port — interface/placeholder for the future accepted V2.1.2 generator.
 *
 * DO NOT invent or implement the real V2.1.2 generator here.
 * Chat 1 owns V2.1.2 remediation independently.
 */

import {
  GENERATOR_PORT_ID,
  GENERATOR_VERSION_PIN_UNBOUND,
} from "./constants";
import { semanticFingerprint, sha256Hex } from "./hash";
import { assertPathNotUnderForbidden } from "./paths";
import type {
  GeneratorCaseCandidate,
  GeneratorCaseRequest,
  Stage3000GeneratorPort,
} from "./types";

/**
 * Unbound placeholder. Any generateCase call fails closed.
 * Wire the accepted V2.1.2 implementation later via bindAcceptedGeneratorPort.
 */
export class UnboundGeneratorPort implements Stage3000GeneratorPort {
  readonly portId = GENERATOR_PORT_ID;
  readonly generatorVersionPin = GENERATOR_VERSION_PIN_UNBOUND;
  readonly isBound = false;

  async generateCase(_request: GeneratorCaseRequest): Promise<GeneratorCaseCandidate> {
    throw new Error(
      "Stage-3000 generator port is unbound. " +
        "Bind the accepted V2.1.2 generator after pilot acceptance. " +
        "This foundation does not implement case generation.",
    );
  }
}

/**
 * Test-only synthetic fixture generator.
 * NOT the V2.1.2 generator. Used exclusively by contract fixtures.
 */
export class SyntheticFixtureGeneratorPort implements Stage3000GeneratorPort {
  readonly portId = "synthetic-fixture-generator-port";
  readonly generatorVersionPin: string;
  readonly isBound = true;

  private readonly crashSlots: Set<number>;
  private readonly rejectLocalIndexes: Set<string>;
  private readonly duplicateTextForCaseIds: Map<string, string>;
  private readonly customText: Map<string, string>;

  constructor(opts?: {
    generatorVersionPin?: string;
    /** Global slots that throw once (simulating shard crash). */
    crashSlots?: number[];
    /** Keys `${wave}:${shard}:${localIndex}` that produce rejectable markers. */
    rejectKeys?: string[];
    /** Force semantic duplicate by reusing text from another caseId. */
    duplicateTextForCaseIds?: Record<string, string>;
    customText?: Record<string, string>;
  }) {
    this.generatorVersionPin =
      opts?.generatorVersionPin ?? "SYNTHETIC-FIXTURE-v0";
    this.crashSlots = new Set(opts?.crashSlots ?? []);
    this.rejectLocalIndexes = new Set(opts?.rejectKeys ?? []);
    this.duplicateTextForCaseIds = new Map(
      Object.entries(opts?.duplicateTextForCaseIds ?? {}),
    );
    this.customText = new Map(Object.entries(opts?.customText ?? {}));
  }

  clearCrash(slot: number): void {
    this.crashSlots.delete(slot);
  }

  async generateCase(
    request: GeneratorCaseRequest,
  ): Promise<GeneratorCaseCandidate> {
    for (const root of request.forbiddenRoots) {
      assertPathNotUnderForbidden(request.sourceRoot, [root]);
    }
    // Guard: request must not smuggle truth/casebrain paths as sourceRoot.
    for (const forbidden of request.forbiddenRoots) {
      if (
        request.sourceRoot === forbidden ||
        request.sourceRoot.startsWith(forbidden + "\\") ||
        request.sourceRoot.startsWith(forbidden + "/")
      ) {
        throw new Error("generator refused sourceRoot under forbidden plane");
      }
    }

    const { identity } = request;
    if (this.crashSlots.has(identity.globalSlot)) {
      this.crashSlots.delete(identity.globalSlot);
      throw new Error(
        `synthetic shard crash at slot ${identity.globalSlot}`,
      );
    }

    const rejectKey = `${identity.wave}:${identity.shard}:${identity.localIndex}`;
    let text =
      this.customText.get(identity.caseId) ??
      this.duplicateTextForCaseIds.get(identity.caseId) ??
      `synthetic-case ${identity.caseId} seed=${identity.seed.slice(0, 12)}`;

    if (this.rejectLocalIndexes.has(rejectKey)) {
      text = `REJECT_MARKER ${text}`;
    }

    const contentSha256 = sha256Hex(text);
    return {
      caseId: identity.caseId,
      contentText: text,
      contentSha256,
      semanticFingerprint: semanticFingerprint(text),
      generatorVersionPin: this.generatorVersionPin,
    };
  }
}

export function createUnboundGeneratorPort(): Stage3000GeneratorPort {
  return new UnboundGeneratorPort();
}

/**
 * Future wiring hook — accepts an already-accepted V2.1.2 port implementation.
 * Foundation ships no real implementation.
 */
export function bindAcceptedGeneratorPort(
  port: Stage3000GeneratorPort,
): Stage3000GeneratorPort {
  if (!port.isBound) {
    throw new Error("cannot bind an unbound generator port");
  }
  if (port.generatorVersionPin === GENERATOR_VERSION_PIN_UNBOUND) {
    throw new Error("cannot bind placeholder unbound version pin");
  }
  if (!port.generatorVersionPin.includes("V2.1.2") && !port.generatorVersionPin.startsWith("SYNTHETIC-")) {
    // Allow synthetic pins in contracts; require V2.1.2 marker for real binds later.
    throw new Error(
      `refusing bind: generatorVersionPin must reference accepted V2.1.2 (got ${port.generatorVersionPin})`,
    );
  }
  return port;
}

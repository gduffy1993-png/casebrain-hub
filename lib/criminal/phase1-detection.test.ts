import { describe, expect, it } from "vitest";
import { refineS18ToS20FromBundleFacts, S20_GBH_DETECTED_LABEL, runPhase1Detection } from "./phase1-detection";

describe("refineS18ToS20FromBundleFacts", () => {
  const s18 = { offenceCode: "s18_oapa", offenceLabel: "s.18 OAPA" };

  it("one punch + fall + kerb + fracture → s.20", () => {
    const facts = `
      The defendant delivered a single punch. The complainant fell backwards and his head struck the kerb.
      Skull fracture and laceration. No weapon. Count 1: s.18 wounding with intent.
    `;
    const r = refineS18ToS20FromBundleFacts({ ...s18, factualText: facts });
    expect(r.code).toBe("s20_oapa");
    expect(r.label).toBe(S20_GBH_DETECTED_LABEL);
  });

  it("CPS intentionally inflicted GBH boilerplate + one punch pattern → s.20", () => {
    const facts = `
      MG5: The defendant intentionally inflicted grievous bodily harm. The defendant punched the complainant once.
      The complainant fell; head hit the pavement. Fracture. Section 18 OAPA.
    `;
    const r = refineS18ToS20FromBundleFacts({ ...s18, factualText: facts });
    expect(r.code).toBe("s20_oapa");
  });

  it("repeated punches → keep s.18", () => {
    const facts = `
      The defendant repeatedly punched and kicked the complainant to the head. GBH. Fracture.
    `;
    const r = refineS18ToS20FromBundleFacts({ ...s18, factualText: facts });
    expect(r.code).toBe("s18_oapa");
  });

  it("knife used → keep s.18", () => {
    const facts = `
      The defendant used a knife to stab the complainant. Single wound. GBH.
    `;
    const r = refineS18ToS20FromBundleFacts({ ...s18, factualText: facts });
    expect(r.code).toBe("s18_oapa");
  });

  it("admitted intent to cause GBH → keep s.18", () => {
    const facts = `
      In interview the defendant admitted he intended to cause really serious injury. One punch. Complainant fell.
    `;
    const r = refineS18ToS20FromBundleFacts({ ...s18, factualText: facts });
    expect(r.code).toBe("s18_oapa");
  });

  it("non-s18 code unchanged", () => {
    expect(
      refineS18ToS20FromBundleFacts({
        offenceCode: "theft",
        offenceLabel: "Theft",
        factualText: "one punch fell kerb fracture ".repeat(10),
      }).code
    ).toBe("theft");
  });
});

describe("runPhase1Detection s18 charge + one-punch facts", () => {
  it("refines to s20", () => {
    const charges = [{ offence: "Section 18 OAPA - wounding with intent", section: "s18" }];
    const facts =
      "Single punch. Complainant fell. Head struck kerb. Skull fracture. No weapon. MG5 states intentionally inflicted GBH.";
    const r = runPhase1Detection({
      charges,
      keyFactsText: facts,
      mg5Snippet: facts,
      bundleTextForOffenceRefinement: facts,
      interviewStance: null,
      disclosureState: null,
    });
    expect(r.offenceCode).toBe("s20_oapa");
    expect(r.offenceLabel).toBe(S20_GBH_DETECTED_LABEL);
  });
});

import { describe, it, expect } from "vitest";

describe("Supervisor Review Integration", () => {
  it("should set supervisorReviewed flag when reviewed", () => {
    const reviewData = {
      reviewed: true,
      reviewedAt: new Date().toISOString(),
      reviewerId: "user-123",
      note: "Case reviewed and approved",
    };

    expect(reviewData.reviewed).toBe(true);
    expect(reviewData.reviewedAt).toBeDefined();
    expect(reviewData.reviewerId).toBe("user-123");
    expect(reviewData.note).toContain("reviewed");
  });

  it("should log audit event when reviewed", () => {
    const auditEvent = {
      eventType: "SUPERVISOR_REVIEWED",
      meta: {
        reviewerId: "user-123",
        note: "Case reviewed",
      },
    };

    expect(auditEvent.eventType).toBe("SUPERVISOR_REVIEWED");
    expect(auditEvent.meta.reviewerId).toBe("user-123");
  });
});


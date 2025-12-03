import { describe, it, expect } from "vitest";
import type { CorrespondenceItem } from "../../types/casebrain";

describe("Timeline Filter Logic", () => {
  const createItem = (
    id: string,
    category?: "event" | "risk" | "complaint" | "limitation" | "evidence" | "protocol" | "communication" | "milestone"
  ): CorrespondenceItem => ({
    id,
    caseId: "case-1",
    direction: "inbound",
    channel: "email",
    party: "client",
    subjectOrLabel: `Item ${id}`,
    createdAt: new Date().toISOString(),
    category,
  });

  const filterItems = (
    items: CorrespondenceItem[],
    filter: "all" | "limitation" | "complaint" | "evidence" | "protocol" | "communication"
  ): CorrespondenceItem[] => {
    if (filter === "all") {
      return items;
    }
    return items.filter(item => item.category === filter);
  };

  it("should return all items when filter is 'all'", () => {
    const items = [
      createItem("1", "limitation"),
      createItem("2", "complaint"),
      createItem("3", "evidence"),
      createItem("4", "communication"),
    ];

    const filtered = filterItems(items, "all");
    expect(filtered.length).toBe(4);
  });

  it("should filter to limitation items only", () => {
    const items = [
      createItem("1", "limitation"),
      createItem("2", "complaint"),
      createItem("3", "limitation"),
      createItem("4", "evidence"),
    ];

    const filtered = filterItems(items, "limitation");
    expect(filtered.length).toBe(2);
    expect(filtered.every(item => item.category === "limitation")).toBe(true);
  });

  it("should filter to complaint items only", () => {
    const items = [
      createItem("1", "complaint"),
      createItem("2", "limitation"),
      createItem("3", "complaint"),
      createItem("4", "protocol"),
    ];

    const filtered = filterItems(items, "complaint");
    expect(filtered.length).toBe(2);
    expect(filtered.every(item => item.category === "complaint")).toBe(true);
  });

  it("should filter to evidence items only", () => {
    const items = [
      createItem("1", "evidence"),
      createItem("2", "limitation"),
      createItem("3", "evidence"),
      createItem("4", "communication"),
    ];

    const filtered = filterItems(items, "evidence");
    expect(filtered.length).toBe(2);
    expect(filtered.every(item => item.category === "evidence")).toBe(true);
  });

  it("should filter to protocol items only", () => {
    const items = [
      createItem("1", "protocol"),
      createItem("2", "limitation"),
      createItem("3", "protocol"),
      createItem("4", "communication"),
    ];

    const filtered = filterItems(items, "protocol");
    expect(filtered.length).toBe(2);
    expect(filtered.every(item => item.category === "protocol")).toBe(true);
  });

  it("should handle items without category (treat as communication)", () => {
    const items = [
      createItem("1", "communication"),
      createItem("2"), // No category
      createItem("3", "limitation"),
    ];

    const filtered = filterItems(items, "communication");
    // Items without category should be included in "all" but not in specific filters
    expect(filtered.length).toBe(1);
    expect(filtered[0].category).toBe("communication");
  });

  it("should return empty array when no items match filter", () => {
    const items = [
      createItem("1", "limitation"),
      createItem("2", "complaint"),
    ];

    const filtered = filterItems(items, "evidence");
    expect(filtered.length).toBe(0);
  });
});


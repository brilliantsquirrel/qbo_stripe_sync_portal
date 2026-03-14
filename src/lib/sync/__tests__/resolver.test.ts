import { resolveConflict } from "@/lib/sync/resolver";

describe("resolveConflict", () => {
  it("returns stripe winner when QBO has no updatedAt", () => {
    const result = resolveConflict(null, new Date("2024-01-15"));
    expect(result.winner).toBe("stripe");
    expect(result.shouldUpdateQbo).toBe(true);
    expect(result.shouldUpdateStripe).toBe(false);
  });

  it("returns qbo winner when Stripe has no updatedAt", () => {
    const result = resolveConflict(new Date("2024-01-15"), null);
    expect(result.winner).toBe("qbo");
    expect(result.shouldUpdateQbo).toBe(false);
    expect(result.shouldUpdateStripe).toBe(true);
  });

  it("returns qbo winner when QBO is more recent", () => {
    const result = resolveConflict(
      new Date("2024-01-20"),
      new Date("2024-01-10")
    );
    expect(result.winner).toBe("qbo");
    expect(result.shouldUpdateStripe).toBe(true);
  });

  it("returns stripe winner when Stripe is more recent", () => {
    const result = resolveConflict(
      new Date("2024-01-10"),
      new Date("2024-01-20")
    );
    expect(result.winner).toBe("stripe");
    expect(result.shouldUpdateQbo).toBe(true);
  });

  it("returns qbo winner on tie (QBO is source of truth)", () => {
    const date = new Date("2024-01-15");
    const result = resolveConflict(date, date);
    expect(result.winner).toBe("qbo");
  });

  it("returns db winner when both are null", () => {
    const result = resolveConflict(null, null);
    expect(result.winner).toBe("db");
    expect(result.shouldUpdateQbo).toBe(false);
    expect(result.shouldUpdateStripe).toBe(false);
  });
});

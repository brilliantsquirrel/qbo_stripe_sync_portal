/**
 * Conflict resolution for bidirectional QBO <-> Stripe sync.
 *
 * Rule: The record with the most recent updatedAt wins.
 * Ties: QBO is preferred (it is the accounting system of record).
 */

export type SyncSource = "qbo" | "stripe" | "db";

export interface ResolutionResult {
  winner: SyncSource;
  shouldUpdateQbo: boolean;
  shouldUpdateStripe: boolean;
}

/**
 * Determine which version of a record should be canonical.
 * Pass null for a timestamp if the record doesn't exist in that system.
 */
export function resolveConflict(
  qboUpdatedAt: Date | null,
  stripeUpdatedAt: Date | null
): ResolutionResult {
  if (!qboUpdatedAt && !stripeUpdatedAt) {
    return { winner: "db", shouldUpdateQbo: false, shouldUpdateStripe: false };
  }

  if (!qboUpdatedAt) {
    // Only in Stripe — Stripe wins, write to QBO
    return {
      winner: "stripe",
      shouldUpdateQbo: true,
      shouldUpdateStripe: false,
    };
  }

  if (!stripeUpdatedAt) {
    // Only in QBO — QBO wins, write to Stripe
    return {
      winner: "qbo",
      shouldUpdateQbo: false,
      shouldUpdateStripe: true,
    };
  }

  if (qboUpdatedAt >= stripeUpdatedAt) {
    // QBO wins (also wins on tie)
    return {
      winner: "qbo",
      shouldUpdateQbo: false,
      shouldUpdateStripe: true,
    };
  }

  // Stripe wins
  return {
    winner: "stripe",
    shouldUpdateQbo: true,
    shouldUpdateStripe: false,
  };
}

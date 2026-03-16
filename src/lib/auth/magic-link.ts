import { prisma } from "@/lib/db/client";
import { generateOtp, generateSessionToken, sha256 } from "@/lib/utils/crypto";
import { sendMagicLinkEmail } from "@/lib/email/resend";

const OTP_TTL_MINUTES = 15;

/**
 * Find a customer by email, checking both the primary email and the
 * comma-separated allowedEmails list.
 */
async function findCustomerByEmail(email: string, vendorId: string) {
  // Try primary email first (uses the unique index — fastest path)
  const byPrimary = await prisma.customer.findUnique({
    where: { vendorId_email: { vendorId, email } },
  });
  if (byPrimary) return byPrimary;

  // Fall back to allowedEmails (comma-separated, case-insensitive search)
  const candidates = await prisma.customer.findMany({
    where: {
      vendorId,
      allowedEmails: { not: null },
    },
  });

  const lower = email.toLowerCase();
  return (
    candidates.find((c) =>
      c.allowedEmails
        ?.split(",")
        .map((e) => e.trim().toLowerCase())
        .includes(lower)
    ) ?? null
  );
}

/**
 * Generate a 6-digit OTP for a customer, store its hash in DB, and send email.
 * Resolves the customer by primary email OR any address in allowedEmails.
 * Idempotent: deletes any existing unused tokens for this customer first.
 */
export async function sendMagicLink(
  email: string,
  vendorId: string
): Promise<{ success: boolean; error?: string }> {
  const customer = await findCustomerByEmail(email, vendorId);

  if (!customer) {
    // Return success anyway to prevent email enumeration
    return { success: true };
  }

  // Clean up old tokens
  await prisma.magicToken.deleteMany({
    where: { customerId: customer.id, usedAt: null },
  });

  const otp = generateOtp(6);
  const tokenHash = sha256(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.magicToken.create({
    data: { customerId: customer.id, tokenHash, expiresAt },
  });

  await sendMagicLinkEmail({ to: email, otp, customerName: customer.name });

  return { success: true };
}

/**
 * Verify a submitted OTP. On success, creates a session and returns the token.
 * Resolves the customer by primary email OR any address in allowedEmails.
 * Returns null if the OTP is invalid or expired.
 */
export async function verifyOtp(
  email: string,
  vendorId: string,
  otp: string
): Promise<{ sessionToken: string; customerId: string } | null> {
  const tokenHash = sha256(otp);

  const customer = await findCustomerByEmail(email, vendorId);
  if (!customer) return null;

  // Re-fetch with the token included
  const customerWithToken = await prisma.customer.findUnique({
    where: { id: customer.id },
    include: {
      magicTokens: {
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        take: 1,
      },
    },
  });

  if (!customerWithToken || customerWithToken.magicTokens.length === 0) {
    return null;
  }

  const magicToken = customerWithToken.magicTokens[0];

  // Mark token as used and create session atomically
  const sessionToken = generateSessionToken();
  const sessionExpiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  );

  await prisma.$transaction([
    prisma.magicToken.update({
      where: { id: magicToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.customerSession.create({
      data: {
        customerId: customer.id,
        sessionToken,
        expiresAt: sessionExpiresAt,
      },
    }),
  ]);

  return { sessionToken, customerId: customer.id };
}

/**
 * Validate a session token and return the customer, or null if invalid/expired.
 */
export async function getCustomerFromSession(
  sessionToken: string
): Promise<{ id: string; email: string; name: string; vendorId: string } | null> {
  const session = await prisma.customerSession.findUnique({
    where: { sessionToken },
    include: { customer: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return {
    id: session.customer.id,
    email: session.customer.email,
    name: session.customer.name,
    vendorId: session.customer.vendorId,
  };
}

/**
 * Send an OTP directly to a known customer by ID, to a specific email address.
 * Used by the vendor magic-link route where the customer is already verified —
 * avoids a redundant email→customer lookup.
 */
export async function sendMagicLinkById(
  customerId: string,
  toEmail: string
): Promise<void> {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
  });

  // Clean up old tokens
  await prisma.magicToken.deleteMany({
    where: { customerId, usedAt: null },
  });

  const otp = generateOtp(6);
  const tokenHash = sha256(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.magicToken.create({
    data: { customerId, tokenHash, expiresAt },
  });

  await sendMagicLinkEmail({ to: toEmail, otp, customerName: customer.name });
}

/**
 * Destroy a customer session (logout).
 */
export async function destroySession(sessionToken: string): Promise<void> {
  await prisma.customerSession.deleteMany({ where: { sessionToken } });
}

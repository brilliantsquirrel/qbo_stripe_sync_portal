import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "noreply@example.com";
const APP_NAME = "QBO Stripe Sync Portal";

interface MagicLinkEmailParams {
  to: string;
  otp: string;
  customerName: string;
}

export async function sendMagicLinkEmail({
  to,
  otp,
  customerName,
}: MagicLinkEmailParams): Promise<void> {
  // In development without a Resend key, log the OTP to the console instead
  // of failing. Remove this branch before going to production.
  if (!process.env.RESEND_API_KEY) {
    console.log(
      `\n🔑 [DEV] Magic link OTP for ${customerName} <${to}>: ${otp}\n`
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Your login code for ${APP_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Hi ${customerName},</h2>
        <p>Your one-time login code is:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center;
                    background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
          ${otp}
        </div>
        <p>This code expires in 15 minutes. Do not share it with anyone.</p>
        <p style="color: #71717a; font-size: 12px;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

interface PaymentConfirmationEmailParams {
  to: string;
  customerName: string;
  invoiceNumber: string;
  amountFormatted: string;
}

export async function sendPaymentConfirmationEmail({
  to,
  customerName,
  invoiceNumber,
  amountFormatted,
}: PaymentConfirmationEmailParams): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Payment received — Invoice ${invoiceNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Payment Confirmed</h2>
        <p>Hi ${customerName},</p>
        <p>We received your payment of <strong>${amountFormatted}</strong>
           for invoice <strong>${invoiceNumber}</strong>.</p>
        <p>Log in to your portal to download your receipt.</p>
      </div>
    `,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

interface AutoPayNotificationParams {
  to: string;
  customerName: string;
  invoiceNumber: string;
  amountFormatted: string;
}

export async function sendAutoPayNotificationEmail({
  to,
  customerName,
  invoiceNumber,
  amountFormatted,
}: AutoPayNotificationParams): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Auto-pay scheduled — Invoice ${invoiceNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Auto-Pay Scheduled</h2>
        <p>Hi ${customerName},</p>
        <p>Auto-pay of <strong>${amountFormatted}</strong> is scheduled for
           invoice <strong>${invoiceNumber}</strong>.</p>
        <p>Log in to your portal to review or cancel before processing.</p>
      </div>
    `,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

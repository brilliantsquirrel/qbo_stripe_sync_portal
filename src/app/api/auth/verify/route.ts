import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/auth/magic-link";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().email(),
  vendorId: z.string().min(1),
  otp: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, vendorId, otp } = schema.parse(body);

    const result = await verifyOtp(email, vendorId, otp);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired code." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: CUSTOMER_SESSION_COOKIE,
      value: result.sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

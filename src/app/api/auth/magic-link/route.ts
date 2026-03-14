import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendMagicLink } from "@/lib/auth/magic-link";

const schema = z.object({
  email: z.string().email(),
  vendorId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, vendorId } = schema.parse(body);
    await sendMagicLink(email, vendorId);
    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

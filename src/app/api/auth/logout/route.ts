import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/magic-link";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/auth/session";

export async function DELETE(req: NextRequest) {
  const sessionToken = req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (sessionToken) {
    await destroySession(sessionToken);
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete(CUSTOMER_SESSION_COOKIE);
  return response;
}

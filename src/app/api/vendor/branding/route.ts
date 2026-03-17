import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const BrandingSchema = z.object({
  portalTitle: z.string().max(80).optional().nullable(),
  brandBgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  brandTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  brandLinkColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  brandButtonBg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  brandButtonText: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  brandFontFamily: z.string().max(100).optional().nullable(),
});

export async function GET() {
  const vendor = await requireVendor();
  const data = await prisma.vendor.findUniqueOrThrow({
    where: { id: vendor.id },
    select: {
      portalTitle: true,
      brandBgColor: true,
      brandTextColor: true,
      brandLinkColor: true,
      brandButtonBg: true,
      brandButtonText: true,
      brandFontFamily: true,
    },
  });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const vendor = await requireVendor();
  const body = await req.json();
  const parsed = BrandingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const updated = await prisma.vendor.update({
    where: { id: vendor.id },
    data: parsed.data,
    select: {
      portalTitle: true,
      brandBgColor: true,
      brandTextColor: true,
      brandLinkColor: true,
      brandButtonBg: true,
      brandButtonText: true,
      brandFontFamily: true,
    },
  });
  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const customer = await requireCustomer();
  const data = await prisma.customer.findUnique({
    where: { id: customer.id },
    select: { autoPayEnabled: true, autoPayMethodId: true, autoPayThreshold: true },
  });
  return NextResponse.json(data);
}

const schema = z.object({
  autoPayEnabled: z.boolean().optional(),
  autoPayMethodId: z.string().optional(),
  autoPayThreshold: z.number().int().min(0).optional(),
});

export async function PATCH(req: NextRequest) {
  const customer = await requireCustomer();
  const body = await req.json();
  const data = schema.parse(body);

  await prisma.customer.update({
    where: { id: customer.id },
    data,
  });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/session";
import {
  createSetupIntent,
  listPaymentMethods,
  detachPaymentMethod,
} from "@/lib/stripe/payments";

export async function GET() {
  const customer = await requireCustomer();
  const methods = await listPaymentMethods(customer.vendorId, customer.id);
  return NextResponse.json({ paymentMethods: methods });
}

export async function POST() {
  const customer = await requireCustomer();
  const result = await createSetupIntent(customer.vendorId, customer.id);
  return NextResponse.json(result);
}

const deleteSchema = z.object({ paymentMethodId: z.string() });

export async function DELETE(req: NextRequest) {
  const customer = await requireCustomer();
  const body = await req.json();
  const { paymentMethodId } = deleteSchema.parse(body);
  await detachPaymentMethod(customer.vendorId, paymentMethodId);
  return NextResponse.json({ success: true });
}

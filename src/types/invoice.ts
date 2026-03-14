export interface InvoiceWithCustomer {
  id: string;
  vendorId: string;
  customerId: string;
  qboInvoiceId: string | null;
  stripeInvoiceId: string | null;
  invoiceNumber: string | null;
  status: "UNPAID" | "PARTIAL" | "PAID" | "VOID";
  amountTotal: number; // cents
  amountPaid: number;  // cents
  amountDue: number;   // cents
  currency: string;
  dueDate: Date | null;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  lineItems: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // cents
  amount: number;    // cents
}

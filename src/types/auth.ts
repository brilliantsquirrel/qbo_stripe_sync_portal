export interface CustomerSession {
  id: string;
  email: string;
  name: string;
  vendorId: string;
}

export interface VendorSession {
  id: string;
  email: string;
  name: string;
  role: "VENDOR" | "PLATFORM_ADMIN";
}

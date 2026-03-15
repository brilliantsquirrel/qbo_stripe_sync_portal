// Type declarations for QBO libraries that ship without TypeScript types.

declare module "intuit-oauth" {
  class OAuthClient {
    constructor(config: {
      clientId: string;
      clientSecret: string;
      environment: "sandbox" | "production";
      redirectUri: string;
    });
    authorizeUri(params: { scope: string[]; state: string }): string;
    createToken(url: string): Promise<OAuthClient>;
    setToken(token: object): void;
    refresh(): Promise<{ getJson(): Record<string, string & number> }>;
    getToken(): {
      realmId: string;
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  }
  export default OAuthClient;
}

declare module "node-quickbooks" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Callback<T = any> = (err: Error | null, result: T) => void;

  class QuickBooks {
    constructor(
      consumerKey: string,
      consumerSecret: string,
      oauthToken: string,
      oauthTokenSecret: boolean,
      realmId: string,
      useSandbox: boolean,
      debug: boolean,
      minorVersion: null,
      oauthVersion: string,
      refreshToken: string
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findInvoices(criteria: object, callback: Callback<any>): void;
    getInvoicePdf(id: string, callback: Callback<Buffer>): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createPayment(payment: object, callback: Callback<any>): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findCustomers(criteria: object, callback: Callback<any>): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findCreditMemos(criteria: object, callback: Callback<any>): void;
    getCreditMemoPdf(id: string, callback: Callback<Buffer>): void;
  }
  export default QuickBooks;
}

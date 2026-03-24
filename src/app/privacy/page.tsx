import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Synvio",
  description: "Privacy Policy for Synvio",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Effective date: March 23, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Overview</h2>
            <p>
              Synvio (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is a software service that connects
              QuickBooks Online and Stripe to help businesses sync invoices, products, and payments,
              and to allow their customers to pay invoices online. This Privacy Policy describes how
              we collect, use, store, and share information when you use Synvio at{" "}
              <a href="https://synvio.io" className="text-blue-600 hover:underline">synvio.io</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-semibold text-gray-800 mb-2">From vendors (businesses using Synvio)</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Email address and account credentials</li>
              <li>QuickBooks Online OAuth tokens (encrypted at rest)</li>
              <li>Stripe account credentials and API keys (encrypted at rest)</li>
              <li>Business name and branding preferences</li>
              <li>Billing information processed via Stripe</li>
            </ul>
            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">From customers (end users paying invoices)</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name and email address</li>
              <li>Invoice and payment history as synced from QuickBooks Online and Stripe</li>
              <li>Payment method information, processed and stored by Stripe — we do not store raw card data</li>
            </ul>
            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">Automatically collected</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Server log data (IP address, browser type, pages visited, timestamps)</li>
              <li>Cookies and session tokens used for authentication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To authenticate users and maintain secure sessions</li>
              <li>To sync data between QuickBooks Online and Stripe on your behalf</li>
              <li>To enable customers to view and pay invoices</li>
              <li>To send transactional emails (login codes, payment confirmations)</li>
              <li>To process vendor subscription billing</li>
              <li>To diagnose errors and improve the service</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal information. We do not use your data for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. How We Store and Protect Your Information</h2>
            <p>
              All data is stored in a PostgreSQL database hosted on Google Cloud Platform. Sensitive
              credentials — including QuickBooks OAuth tokens and Stripe API keys — are encrypted at
              rest using AES-256-GCM before being written to the database.
            </p>
            <p className="mt-3">
              All data in transit is protected by TLS (HTTPS). Access to production systems is
              restricted to authorized personnel only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Third-Party Services</h2>
            <p>Synvio integrates with the following third-party services, each governed by their own privacy policies:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <strong>Intuit QuickBooks Online</strong> — accounting data is accessed via Intuit&apos;s
                OAuth 2.0 API on your behalf.{" "}
                <a href="https://www.intuit.com/privacy/statement/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Intuit Privacy Statement</a>
              </li>
              <li>
                <strong>Stripe</strong> — payment processing and Connect platform for vendor payouts.{" "}
                <a href="https://stripe.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a>
              </li>
              <li>
                <strong>Resend</strong> — transactional email delivery.{" "}
                <a href="https://resend.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Resend Privacy Policy</a>
              </li>
              <li>
                <strong>Google Cloud Platform</strong> — infrastructure hosting (Cloud Run, Cloud SQL, Cloud Tasks).{" "}
                <a href="https://cloud.google.com/terms/cloud-privacy-notice" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google Cloud Privacy Notice</a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide the
              service. If you close your account, we will delete your personal data and credentials
              within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Disconnect your QuickBooks or Stripe account at any time from your settings</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Children&apos;s Privacy</h2>
            <p>
              Synvio is not directed at children under 13. We do not knowingly collect personal
              information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the new policy on this page with an updated effective date. Continued
              use of Synvio after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
            <p>If you have questions or concerns about this Privacy Policy, please contact:</p>
            <div className="mt-3 text-gray-700">
              <p className="font-medium">Brilliant Squirrel LLC</p>
              <p>
                Email:{" "}
                <a href="mailto:privacy@synvio.io" className="text-blue-600 hover:underline">
                  privacy@synvio.io
                </a>
              </p>
              <p>Website: <a href="https://synvio.io" className="text-blue-600 hover:underline">synvio.io</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

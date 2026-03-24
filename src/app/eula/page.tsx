import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "End User License Agreement — Synvio",
  description: "End User License Agreement for Synvio",
};

export default function EulaPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">End User License Agreement</h1>
        <p className="text-sm text-gray-500 mb-10">Effective date: March 23, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
            <p>
              This End User License Agreement (&ldquo;Agreement&rdquo;) is a legal agreement between you
              (&ldquo;User&rdquo;, &ldquo;you&rdquo;, or &ldquo;your&rdquo;) and Brilliant Squirrel LLC (&ldquo;Company&rdquo;,
              &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) governing your use of Synvio, available at{" "}
              <a href="https://synvio.io" className="text-blue-600 hover:underline">synvio.io</a>{" "}
              (&ldquo;Service&rdquo;).
            </p>
            <p className="mt-3">
              By accessing or using the Service, you agree to be bound by this Agreement. If you do
              not agree, do not access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. License Grant</h2>
            <p>
              Subject to your compliance with this Agreement, we grant you a limited, non-exclusive,
              non-transferable, revocable license to access and use the Service solely for your
              internal business purposes.
            </p>
            <p className="mt-3">
              This license does not include the right to sublicense, resell, or otherwise transfer
              access to the Service to any third party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activity that occurs under your account. You agree to notify us immediately
              of any unauthorized use of your account at{" "}
              <a href="mailto:support@synvio.io" className="text-blue-600 hover:underline">support@synvio.io</a>.
            </p>
            <p className="mt-3">
              You must provide accurate and complete information when creating an account and keep
              that information current.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
              <li>Attempt to gain unauthorized access to any part of the Service or its infrastructure</li>
              <li>Reverse engineer, decompile, or disassemble any portion of the Service</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Use the Service to transmit malicious code, spam, or fraudulent content</li>
              <li>Impersonate any person or entity or misrepresent your affiliation</li>
              <li>Scrape, crawl, or use automated means to access the Service beyond normal usage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Third-Party Integrations</h2>
            <p>
              The Service integrates with third-party platforms including QuickBooks Online (Intuit)
              and Stripe. Your use of those platforms is governed by their respective terms of service
              and privacy policies. We are not responsible for the availability, accuracy, or conduct
              of any third-party service.
            </p>
            <p className="mt-3">
              You represent that you have the authority to connect your QuickBooks Online and Stripe
              accounts to the Service and that doing so does not violate any agreement you have with
              those providers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>,
              which is incorporated into this Agreement by reference. By using the Service, you
              consent to the collection and use of your information as described therein.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Fees and Payment</h2>
            <p>
              Access to certain features of the Service requires a paid subscription. Subscription
              fees are billed in advance on a recurring basis. All fees are non-refundable except
              as required by law or as otherwise stated in writing.
            </p>
            <p className="mt-3">
              We reserve the right to modify our pricing with at least 30 days&apos; notice. Continued
              use of the Service after a price change constitutes acceptance of the new pricing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Intellectual Property</h2>
            <p>
              The Service and all of its content, features, and functionality — including but not
              limited to software, text, graphics, logos, and interface design — are owned by
              Brilliant Squirrel LLC and are protected by applicable intellectual property laws.
            </p>
            <p className="mt-3">
              You retain ownership of any data you import into or generate through the Service.
              You grant us a limited license to process that data solely to provide the Service to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p className="mt-3">
              WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY
              SECURE. YOU USE THE SERVICE AT YOUR OWN RISK.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL BRILLIANT SQUIRREL LLC BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH
              YOUR USE OF OR INABILITY TO USE THE SERVICE.
            </p>
            <p className="mt-3">
              OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING UNDER THIS AGREEMENT SHALL NOT
              EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM
              OR (B) ONE HUNDRED DOLLARS ($100).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Brilliant Squirrel LLC and its
              officers, directors, employees, and agents from any claims, damages, losses, or
              expenses (including reasonable attorneys&apos; fees) arising out of your use of the
              Service, your violation of this Agreement, or your violation of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time, with or without
              cause, with or without notice. You may terminate your account at any time by
              contacting us.
            </p>
            <p className="mt-3">
              Upon termination, your license to use the Service immediately ends. Sections 8–11
              and 13–14 survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Governing Law</h2>
            <p>
              This Agreement is governed by the laws of the State of New York, without regard to
              its conflict of law principles. Any disputes arising under this Agreement shall be
              resolved exclusively in the state or federal courts located in New York County,
              New York, and you consent to personal jurisdiction in those courts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Changes to This Agreement</h2>
            <p>
              We may update this Agreement from time to time. We will notify you of material changes
              by posting the updated Agreement on this page with a new effective date. Continued use
              of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Contact Us</h2>
            <p>If you have questions about this Agreement, please contact:</p>
            <div className="mt-3 text-gray-700">
              <p className="font-medium">Brilliant Squirrel LLC</p>
              <p>
                Email:{" "}
                <a href="mailto:legal@synvio.io" className="text-blue-600 hover:underline">
                  legal@synvio.io
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

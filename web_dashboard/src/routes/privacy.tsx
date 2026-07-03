import { createFileRoute } from "@tanstack/react-router";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Vidora" }] }),
  component: PrivacyPage,
});

const BG = "#06070d";
const SUBTEXT = "#94a3b8";
const MUTED = "#64748b";
const PURPLE = "#a78bfa";
const BORDER = "rgba(255,255,255,0.07)";

function PrivacyPage() {
  return (
    <div style={{ background: BG, color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>
      <LandingHeader />

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-16">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm mb-10" style={{ color: MUTED }}>Last updated: May 30, 2026</p>

        <div className="space-y-8">
          <Section title="1. Information We Collect">
            <p>When you create an account, we collect your name, email address, and password (stored securely using bcrypt hashing). We also collect file metadata (file names, sizes, types) when you upload content.</p>
            <p>We automatically collect device information, IP addresses, and usage data (pages visited, features used) to improve our service.</p>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul>
              <li>To provide and maintain our service</li>
              <li>To process your uploads and manage your files</li>
              <li>To calculate and process your earnings and payouts</li>
              <li>To track view counts for monetization purposes</li>
              <li>To communicate with you about your account</li>
              <li>To prevent fraud and ensure platform security</li>
            </ul>
          </Section>

          <Section title="3. File Storage & Security">
            <p>Files you upload are stored securely on our servers. Direct file URLs are never exposed publicly. Access to files is controlled through time-limited, rotating tokens that expire after use.</p>
            <p>We use industry-standard encryption (HTTPS/TLS) for all data in transit and secure storage practices for data at rest.</p>
          </Section>

          <Section title="4. Sharing of Information">
            <p>We do not sell your personal information. We may share limited data with:</p>
            <ul>
              <li>Payment processors (PayPal, Wise, Payoneer) to process your payouts</li>
              <li>Law enforcement when required by law</li>
              <li>Service providers who help us operate the platform</li>
            </ul>
            <p>When you share a file link, only minimal metadata (truncated file name, file type, creator first name) is visible to viewers. Full file URLs are never exposed.</p>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your account data as long as your account is active. If you delete your account, we will remove your personal data within 30 days. Uploaded files are permanently deleted when you remove them.</p>
            <p>Earnings records and payout history are retained for tax and legal compliance purposes.</p>
          </Section>

          <Section title="6. Your Rights">
            <ul>
              <li>Access your personal data via your dashboard</li>
              <li>Update your profile information at any time</li>
              <li>Delete your files at any time</li>
              <li>Request account deletion by contacting support</li>
              <li>Export your data upon request</li>
            </ul>
          </Section>

          <Section title="7. Cookies & Tracking">
            <p>We use localStorage to store authentication tokens (JWT). We do not use third-party tracking cookies. Analytics data is collected server-side and is not shared with advertisers.</p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>Vidora is not intended for users under 13 years of age. We do not knowingly collect personal information from children. If we discover that a child under 13 has provided us with personal data, we will delete it immediately.</p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
          </Section>

          <Section title="10. Contact Us">
            <p>If you have questions about this privacy policy, contact us at:</p>
            <ul>
              <li>Email: <a href="mailto:privacy@vidora.app" style={{ color: PURPLE }}>privacy@vidora.app</a></li>
              <li>Telegram: <a href="https://t.me/vidorasupport" target="_blank" rel="noopener noreferrer" style={{ color: PURPLE }}>@vidorasupport</a></li>
            </ul>
            <p className="mt-4">Vidora<br />CN-33, Pathkhauli, Kaptanganj 274301<br />Kushinagar, India</p>
          </Section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[22px] p-6"
      style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}
    >
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-[#94a3b8] [&_p]:text-[#94a3b8]">
        {children}
      </div>
    </div>
  );
}

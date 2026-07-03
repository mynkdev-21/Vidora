import { createFileRoute } from "@tanstack/react-router";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms & Conditions — Vidora" }] }),
  component: TermsPage,
});

const BG = "#06070d"; const MUTED = "#64748b"; const SUBTEXT = "#94a3b8";
const PURPLE = "#a78bfa"; const BORDER = "rgba(255,255,255,0.07)";

function TermsPage() {
  return (
    <div style={{ background: BG, color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-16">
        <h1 className="text-3xl font-bold text-white mb-2">Terms & Conditions</h1>
        <p className="text-sm mb-10" style={{ color: MUTED }}>Last updated: May 31, 2026</p>

        <div className="space-y-8">
          <Section title="1. Acceptance of Terms">
            <p>By accessing or using Vidora ("the Platform"), you agree to be bound by these Terms & Conditions. If you do not agree, do not use the Platform.</p>
          </Section>

          <Section title="2. Account Registration">
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. One account per person — duplicate accounts may be terminated.</p>
          </Section>

          <Section title="3. Content Upload">
            <ul>
              <li>You retain ownership of content you upload</li>
              <li>You grant Vidora a license to host, distribute, and display your content</li>
              <li>You must not upload illegal, copyrighted (without permission), or harmful content</li>
              <li>Vidora reserves the right to remove content that violates these terms</li>
            </ul>
          </Section>

          <Section title="4. Monetization & Earnings">
            <ul>
              <li>Earnings rate: $5 per 1,000 views (subject to change with notice)</li>
              <li>Views are counted only through the official Vidora app</li>
              <li>Artificial view inflation (bots, scripts, repeated views) is prohibited and will result in account termination</li>
              <li>Minimum payout threshold: $5.00</li>
              <li>Withdrawals are processed on the 27th and 28th of each month</li>
              <li>Vidora reserves the right to withhold payouts if fraud is suspected</li>
            </ul>
          </Section>

          <Section title="5. Referral Program">
            <ul>
              <li>You earn 5% of your referral's withdrawal amount</li>
              <li>Self-referrals are not allowed</li>
              <li>Referral bonuses are credited automatically when your referral withdraws</li>
              <li>Abuse of the referral system will result in forfeiture of bonuses</li>
            </ul>
          </Section>

          <Section title="6. Prohibited Activities">
            <ul>
              <li>Using bots or automated tools to inflate views</li>
              <li>Uploading malware, viruses, or harmful files</li>
              <li>Sharing copyrighted content without authorization</li>
              <li>Creating multiple accounts for bonus exploitation</li>
              <li>Attempting to bypass ad requirements or security measures</li>
              <li>Reverse engineering the app or API</li>
            </ul>
          </Section>

          <Section title="7. Termination">
            <p>Vidora may suspend or terminate your account at any time for violation of these terms. Upon termination, pending earnings may be forfeited if fraud is involved. You may delete your account at any time through Settings.</p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>Vidora is provided "as is" without warranties. We are not liable for lost earnings, data loss, or service interruptions. Maximum liability is limited to the amount paid to you in the last 30 days.</p>
          </Section>

          <Section title="9. Changes to Terms">
            <p>We may update these terms at any time. Continued use of the Platform after changes constitutes acceptance. Major changes will be communicated via email or in-app notification.</p>
          </Section>

          <Section title="10. Contact">
            <p>Questions about these terms? Contact us:</p>
            <ul>
              <li>Email: <a href="mailto:legal@vidora.app" style={{ color: PURPLE }}>legal@vidora.app</a></li>
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
    <div className="rounded-[22px] p-6" style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-[#94a3b8] [&_p]:text-[#94a3b8]">
        {children}
      </div>
    </div>
  );
}

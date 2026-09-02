import React from 'react';
import { FileText, X } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="glass-panel border-glow-top rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-white" />
            <h2 className="text-base font-bold text-white">Terms of Service</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 text-xs text-zinc-400 leading-relaxed font-mono">
          <p className="text-zinc-500">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">1. Acceptance of Terms</h3>
            <p>By creating an account and using LLM Meter ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">2. Description of Service</h3>
            <p>LLM Meter provides an API token billing and subscription tracking platform that allows users to monitor usage, costs, and quota consumption across multiple AI LLM providers. We do not provide AI generation services directly — we track and meter usage made through our gateway.</p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">3. Account Responsibilities</h3>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li>You must provide accurate information when creating your account</li>
              <li>You are responsible for maintaining the confidentiality of your password</li>
              <li>You must not share your account credentials with others</li>
              <li>You are responsible for all activity that occurs under your account</li>
              <li>You must be at least 16 years old to use this Service</li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">4. Acceptable Use</h3>
            <p className="mb-1">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li>Use the Service to violate any law or regulation</li>
              <li>Attempt to reverse-engineer or hack the platform</li>
              <li>Use automated bots or scripts to abuse the rate limits</li>
              <li>Impersonate others or create fake accounts</li>
              <li>Transmit malicious code, viruses, or harmful content</li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">5. Subscriptions & Payments</h3>
            <p>Paid features are billed through Stripe. All charges are in USD unless otherwise stated. Subscription fees are non-refundable except where required by law. You may cancel at any time from your account settings.</p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">6. Intellectual Property</h3>
            <p>The LLM Meter platform, including its software, design, and content, is owned by LLM Meter and protected by copyright and intellectual property laws. You retain all rights to the data you enter into the platform.</p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">7. Limitation of Liability</h3>
            <p>To the maximum extent permitted by law, LLM Meter shall not be liable for any indirect, incidental, special, or consequential damages. Our total liability shall not exceed the amount paid by you in the 12 months prior to the claim.</p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">8. Termination</h3>
            <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time from the Settings page. Upon termination, all your data will be permanently erased.</p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">9. Governing Law</h3>
            <p>These terms are governed by applicable law. Disputes shall be resolved through binding arbitration or the courts of the jurisdiction where LLM Meter operates.</p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">10. Contact</h3>
            <p>Questions about these terms: <span className="text-white">legal@flyrank.ai</span></p>
          </section>
        </div>

        <div className="border-t border-zinc-800 px-6 py-3 flex-shrink-0">
          <button onClick={onClose} className="w-full bg-white hover:bg-zinc-200 text-black text-xs font-mono font-semibold py-2.5 px-4 rounded shadow-sm transition-colors uppercase tracking-wider">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

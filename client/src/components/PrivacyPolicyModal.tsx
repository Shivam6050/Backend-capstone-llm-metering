import React from 'react';
import { Shield, X } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="glass-panel border-glow-top rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-white" />
            <h2 className="text-base font-bold text-white">Privacy Policy</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 text-xs text-zinc-400 leading-relaxed font-mono">
          <p className="text-zinc-500">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">1. Who We Are</h3>
            <p>FlyRank AI ("we", "us", "our") operates the FlyRank AI token billing and subscription management platform. We are committed to protecting your personal data and complying with applicable privacy laws including GDPR (EU) and applicable US state privacy laws.</p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">2. Data We Collect</h3>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li><strong className="text-zinc-200">Account data:</strong> Name, email address, hashed password (never stored in plaintext)</li>
              <li><strong className="text-zinc-200">Subscription data:</strong> LLM provider names, plan names, token allowances, and renewal dates you enter</li>
              <li><strong className="text-zinc-200">Usage data:</strong> Token counts processed through our API gateway</li>
              <li><strong className="text-zinc-200">Technical data:</strong> IP address (for rate limiting), browser type (from request headers)</li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">3. How We Use Your Data</h3>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li>To provide, maintain, and improve the service</li>
              <li>To authenticate you and keep your session secure</li>
              <li>To send transactional emails (password reset only — no marketing without consent)</li>
              <li>To enforce rate limits and prevent abuse</li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">4. Data Retention & Erasure</h3>
            <p className="text-zinc-400">We retain your data for as long as your account is active. When you delete your account, all personal data and API tokens are permanently erased within 24 hours.</p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">5. Third Parties</h3>
            <p className="text-zinc-400">We use Stripe for payment processing. Stripe's privacy policy applies to data shared with them. We do not sell your data to any third party.</p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">6. Contact</h3>
            <p className="text-zinc-400">For privacy inquiries or to exercise your rights: <span className="text-white">privacy@flyrank.ai</span></p>
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

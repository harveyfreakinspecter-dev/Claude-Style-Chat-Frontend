import { useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, User, CreditCard, LifeBuoy, Check, Loader2, Send, ArrowRight, Menu, X } from 'lucide-react';

export function SettingsLayout({ children, activeTab }: { children: ReactNode, activeTab: string }) {
  const [railOpen, setRailOpen] = useState(false);

  return (
    <main className="chat-shell noise-layer flex min-h-[100dvh] w-full">
      {railOpen && (
        <button
          type="button"
          className="rail-overlay md:hidden"
          onClick={() => setRailOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside className={`conversation-rail settings-rail ${railOpen ? 'conversation-rail-open' : 'conversation-rail-closed'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 pt-7 pb-4">
            <Link href="/" className="brand-lockup">
              <img src="/discoveryez-logo.png" alt="DiscoveryEZ" />
            </Link>
            <button
              type="button"
              className="icon-button subtle md:hidden"
              onClick={() => setRailOpen(false)}
              aria-label="Close settings menu"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-5 pb-2">
            <Link href="/" className="back-to-chat text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 hover:text-[hsl(var(--foreground))] transition-colors">
              <ArrowLeft size={14} />
              <span>Return to workspace</span>
            </Link>
          </div>
          <nav className="flex-1 px-3 mt-4 space-y-1">
            <Link href="/settings/account" className={`settings-nav-item ${activeTab === 'account' ? 'active' : ''}`}>
              <User size={15} />
              <span>Account</span>
            </Link>
            <Link href="/settings/billing" className={`settings-nav-item ${activeTab === 'billing' ? 'active' : ''}`}>
              <CreditCard size={15} />
              <span>Billing & usage</span>
            </Link>
            <Link href="/settings/support" className={`settings-nav-item ${activeTab === 'support' ? 'active' : ''}`}>
              <LifeBuoy size={15} />
              <span>Support</span>
            </Link>
          </nav>
        </div>
      </aside>
      <section className="flex-1 overflow-y-auto scroll-soft pb-24 relative">
        <header className="md:hidden flex items-center p-4 border-b border-[hsl(var(--border))]">
          <button type="button" className="icon-button subtle" onClick={() => setRailOpen(true)} aria-label="Open settings menu">
             <Menu size={18} />
          </button>
          <span className="ml-3 font-serif font-medium text-lg text-[hsl(var(--foreground))]">Settings</span>
        </header>
        <div className="max-w-2xl mx-auto mt-8 md:mt-16 px-6">
          {children}
        </div>
      </section>
    </main>
  );
}

export function SettingsAccount() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  return (
    <SettingsLayout activeTab="account">
      <div className="settings-page message-enter">
        <div className="settings-header">
          <h2>Account</h2>
          <p>Manage your profile details and password.</p>
        </div>

        <form className="settings-section" onSubmit={handleSave}>
          <h3>Profile</h3>
          <div className="settings-field">
            <label>Name</label>
            <input type="text" defaultValue="Alex Morgan" className="settings-input" />
          </div>
          <div className="settings-field">
            <label>Email</label>
            <input type="email" defaultValue="alex@example.com" className="settings-input" />
          </div>
          
          <h3 className="mt-10">Password</h3>
          <div className="settings-field">
            <label>Current password</label>
            <input type="password" placeholder="••••••••" className="settings-input" />
          </div>
          <div className="settings-field">
            <label>New password</label>
            <input type="password" placeholder="Leave blank to keep same" className="settings-input" />
          </div>

          <div className="settings-actions">
            <button type="submit" disabled={saving} className="settings-btn-primary">
              {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : null}
              {saved ? 'Saved' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
}

export function SettingsBilling() {
  return (
    <SettingsLayout activeTab="billing">
      <div className="settings-page message-enter">
        <div className="settings-header">
          <h2>Billing & usage</h2>
          <p>Manage your plan and monitor space usage.</p>
        </div>

        <div className="settings-section">
          <h3>Current Plan</h3>
          <div className="plan-card">
            <div className="plan-header">
              <div>
                <div className="plan-name">DiscoveryEZ</div>
                <div className="plan-price">$99 <span>/ month introductory rate</span></div>
              </div>
              <div className="plan-status">Active</div>
            </div>
            <p className="plan-desc">14-day free trial, then $99 per month for the first three months and $149 per month thereafter.</p>
            <button type="button" className="settings-btn-secondary mt-4">Manage subscription</button>
          </div>

          <h3 className="mt-12">Usage</h3>
          <div className="usage-stats">
            <div className="usage-stat-row">
              <div className="usage-label">Processing tokens</div>
              <div className="usage-value">1.2M <span className="usage-limit">/ 3M</span></div>
            </div>
            <div className="usage-bar"><div className="usage-fill" style={{width: '40%'}}></div></div>
            
            <div className="usage-stat-row mt-6">
              <div className="usage-label">Active discovery cases</div>
              <div className="usage-value">2 <span className="usage-limit">/ 3</span></div>
            </div>
            <div className="usage-bar"><div className="usage-fill" style={{width: '67%'}}></div></div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}

export function SettingsSupport() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }, 1200);
  };

  return (
    <SettingsLayout activeTab="support">
      <div className="settings-page message-enter">
        <div className="settings-header">
          <h2>Support</h2>
          <p>Get help with your space.</p>
        </div>

        <div className="settings-section">
          <h3>Resources</h3>
          <div className="support-links">
            <button type="button" className="support-link">
              <div>
                <div className="support-link-title">Documentation</div>
                <div className="support-link-desc">Guides on how to use DiscoveryEZ effectively.</div>
              </div>
              <ArrowRight size={16} className="support-arrow" />
            </button>
            <button type="button" className="support-link">
              <div>
                <div className="support-link-title">System Status</div>
                <div className="support-link-desc">Check if all models and services are operational.</div>
              </div>
              <ArrowRight size={16} className="support-arrow" />
            </button>
          </div>

          <h3 className="mt-12">Contact us</h3>
          <form onSubmit={handleSend}>
            <div className="settings-field">
              <label>How can we help?</label>
              <textarea placeholder="Describe the issue you're facing..." className="settings-textarea" required />
            </div>
            <div className="settings-actions mt-4">
              <button type="submit" disabled={sending || sent} className="settings-btn-primary">
                {sending ? <Loader2 size={15} className="animate-spin" /> : sent ? <Check size={15} /> : <Send size={15} />}
                {sent ? 'Message sent' : 'Send message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SettingsLayout>
  );
}

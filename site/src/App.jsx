import './index.css'
import React from 'react'

function Nav() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">✅ maintainable</span>
        <div className="hidden md:flex gap-8 text-sm text-gray-400">
          {['How It Works', 'Why Email', 'Pricing', 'FAQ'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s/g, '-')}`} className="hover:text-white transition-colors">{l}</a>
          ))}
        </div>
        <EmailCopyButton small />
      </div>
    </nav>
  )
}

function EmailCopyButton({ small }) {
  const [copied, setCopied] = React.useState(false);
  const email = 'hello@maintainable.app';
  
  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (small) {
    return (
      <button
        onClick={copyEmail}
        className="text-sm px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2"
      >
        <span className="text-emerald-400 font-mono">{email}</span>
        <span>{copied ? '✓' : '📋'}</span>
      </button>
    );
  }
  
  return (
    <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <span className="text-xl md:text-2xl font-mono text-emerald-400 select-all">{email}</span>
      <button
        onClick={copyEmail}
        className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-sm font-medium transition-all"
      >
        {copied ? '✓ Copied!' : '📋 Copy'}
      </button>
    </div>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-block px-3 py-1 mb-6 text-xs font-medium rounded-full bg-white/5 border border-white/10 text-gray-400">
          No app to download. No streaks to break.
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          Maintain your habits<br />
          <span className="gradient-text">with email</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Just send an email to get started. Get encouragement, patterns, and accountability
          from an AI that remembers every day — not just today.
        </p>
        
        <div className="mb-10">
          <EmailCopyButton />
        </div>
        
        <p className="text-sm text-gray-500">Free to try. No account needed. Just send an email.</p>
      </div>
    </section>
  )
}

function EmailDemo() {
  return (
    <section className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="px-6 py-3 border-b border-white/5 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-2 text-xs text-gray-500">Email</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">You</div>
              <div className="flex-1 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-sm text-gray-300">water 8 glasses, pullups 15, vitamin, smiled a lot, told sarah she looked beautiful today</p>
                <p className="text-xs text-gray-600 mt-2">Day 42 — Feb 11</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">AI</div>
              <div className="flex-1 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-sm text-gray-300">Six weeks strong! 🎉 You're crushing it — 15 pullups is a new personal best since your 12 on Day 38. Water's been consistently at 8 all week. And the Sarah shout-outs are becoming a real pattern — she's heard something nice from you 4 of the last 5 days. Keep that energy going, it clearly fuels everything else.</p>
                <p className="text-xs text-gray-600 mt-2">Replied in 12 seconds</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  { num: '01', icon: '✉️', title: 'Email your check-in', desc: "Write what you did today. No format required — just talk naturally. 'Water 6 glasses, skipped pullups, took vitamin.'" },
  { num: '02', icon: '🧠', title: 'AI remembers everything', desc: 'Your AI knows your history — every good day, every slip, every PR. It spots patterns you miss.' },
  { num: '03', icon: '💬', title: 'Get real encouragement', desc: "Not generic motivation. Specific, context-aware feedback. 'Your pullups are up 40% since week 2' — that kind of thing." },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How it works</h2>
        <p className="text-gray-400 text-center mb-16 max-w-lg mx-auto">You already know how to send an email. That's all you need.</p>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map(s => (
            <div key={s.num} className="relative p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
              <span className="text-xs font-mono text-gray-600 mb-4 block">{s.num}</span>
              <div className="text-3xl mb-4">{s.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const WHY_EMAIL = [
  { icon: '📱', title: 'Already on your phone', desc: "No new app to install, no notifications to configure, no account to create. You've had email for decades." },
  { icon: '🚫', title: 'No streak pressure', desc: "Miss a day? Just email when you're ready. No broken streaks, no guilt mechanics, no red X's." },
  { icon: '👵', title: 'Anyone can use it', desc: 'Your tech-savvy friend and your grandmother both know how to send an email. That\'s the point.' },
  { icon: '🔒', title: 'Private by default', desc: 'No social feed. No public profile. No leaderboards. Your habits are between you and your inbox.' },
  { icon: '⚡', title: 'Takes 30 seconds', desc: 'Type what you did. Hit send. Done. No logging into an app, no tapping through screens, no syncing.' },
  { icon: '🌍', title: 'Works everywhere', desc: 'Any device, any email client, any country. Gmail, Outlook, ProtonMail — whatever you already use.' },
]

function WhyEmail() {
  return (
    <section id="why-email" className="py-24 px-6 bg-white/[0.01]">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Why email?</h2>
        <p className="text-gray-400 text-center mb-16 max-w-lg mx-auto">Every habit app adds friction. We remove it entirely.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHY_EMAIL.map(f => (
            <div key={f.title} className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SocialProof() {
  const quotes = [
    { text: "I've tried Habitica, Streaks, and Done. This is the first one that stuck because it's just... email.", who: "Beta user, 47 days" },
    { text: "My mom uses this. She can barely use her iPhone but she's been emailing her water intake for 3 weeks.", who: "Beta user referral" },
    { text: "The AI actually noticed I always skip pullups on Mondays. Now I plan around it.", who: "Beta user, 30 days" },
  ]
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">What people are saying</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {quotes.map((q, i) => (
            <div key={i} className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-sm text-gray-300 leading-relaxed mb-4">"{q.text}"</p>
              <p className="text-xs text-gray-500">{q.who}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const TIERS = [
  { name: 'Free', credits: '5 check-ins', price: '$0', per: 'Try it out', highlight: false, cta: 'Start Free' },
  { name: 'Monthly', credits: '30 check-ins', price: '$3', per: '$0.10/check-in', highlight: true, cta: 'Get Started' },
  { name: 'Yearly', credits: '365 check-ins', price: '$25', per: '$0.07/check-in', highlight: false, cta: 'Best Value' },
]

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 bg-white/[0.01]">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Simple pricing</h2>
        <p className="text-gray-400 text-center mb-4 max-w-lg mx-auto">Pay for check-ins, not subscriptions you forget to cancel.</p>
        <p className="text-sm text-gray-500 text-center mb-16">Crypto accepted. No credit card required.</p>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {TIERS.map(t => (
            <div key={t.name} className={`p-8 rounded-2xl border ${t.highlight ? 'border-emerald-500/30 bg-emerald-500/[0.03] glow-green' : 'border-white/5 bg-white/[0.02]'} flex flex-col`}>
              <h3 className="text-lg font-semibold mb-1">{t.name}</h3>
              <p className="text-sm text-gray-400 mb-6">{t.credits}</p>
              <div className="text-4xl font-bold mb-1">{t.price}</div>
              <p className="text-xs text-gray-500 mb-8">{t.per}</p>
              <button className={`mt-auto w-full py-3 rounded-full text-sm font-medium transition-colors ${t.highlight ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90' : 'bg-white/10 hover:bg-white/20'}`}>
                {t.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const FAQS = [
  { q: 'What do I email?', a: "Whatever you did today. 'Water 7 glasses, walked 20 min, took vitamins.' No special format — write like you're texting a friend." },
  { q: 'Does it really remember?', a: "Yes. Your AI has your full history. It knows your personal bests, your rough patches, and your patterns. It'll reference them naturally." },
  { q: 'What if I miss a day?', a: "Nothing happens. No broken streak, no guilt notification. Just email when you're ready. The AI will gently acknowledge the gap." },
  { q: 'Can I track anything?', a: "Anything you can describe in an email. Water, exercise, medication, reading, meditation, gratitude — you define your habits, not us." },
  { q: 'How fast are responses?', a: 'Usually under 30 seconds. You send an email, and a thoughtful reply lands in your inbox before you put your phone down.' },
  { q: 'Is it private?', a: "No account, no profile, no social features. Your emails are encrypted at rest. We don't sell data or show ads. Ever." },
]

function FAQ() {
  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">FAQ</h2>
        <div className="space-y-6">
          {FAQS.map(f => (
            <div key={f.q} className="pb-6 border-b border-white/5">
              <h3 className="font-semibold mb-2">{f.q}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to start?</h2>
        <p className="text-gray-400 mb-4">Just send an email to get started.</p>
        <p className="text-gray-500 text-sm mb-8">No signup. No app. Tell us what habits you want to track.</p>
        <EmailCopyButton />
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="text-sm text-gray-500">© 2026 maintainable.app</span>
        <div className="flex gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
          <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
          <span className="text-gray-600">hello@maintainable.app</span>
        </div>
      </div>
    </footer>
  )
}

function FloatingCTA() {
  const [visible, setVisible] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  
  React.useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  if (!visible) return null;
  
  const copyEmail = () => {
    navigator.clipboard.writeText('hello@maintainable.app');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <button
        onClick={copyEmail}
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#0a0a0f]/95 backdrop-blur-xl border border-emerald-500/30 shadow-2xl hover:border-emerald-500/50 transition-colors"
      >
        <span className="text-sm font-mono text-emerald-400">hello@maintainable.app</span>
        <span className="text-xs text-emerald-300">{copied ? '✓' : '📋'}</span>
      </button>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <EmailDemo />
      <HowItWorks />
      <WhyEmail />
      <SocialProof />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
      <FloatingCTA />
    </div>
  )
}

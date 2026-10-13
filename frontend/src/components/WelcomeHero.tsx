import React from 'react';
import { BookOpen, Key, CreditCard, Calculator, ShieldCheck, Sparkles } from 'lucide-react';

interface WelcomeHeroProps {
  onSelectPrompt: (prompt: string) => void;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({ onSelectPrompt }) => {
  const suggestions = [
    {
      title: 'API Rate Limits',
      desc: 'Check free, standard, and enterprise rate tiers and headers.',
      prompt: 'What are the API rate limits for each tier?',
      icon: Key,
      glass: 'glass-blue',
      iconColor: 'text-blue-400',
    },
    {
      title: 'Refund Policy',
      desc: 'Learn about the 14-day money-back guarantee and terms.',
      prompt: 'What is the refund policy for subscription plans?',
      icon: CreditCard,
      glass: 'glass-violet',
      iconColor: 'text-violet-400',
    },
    {
      title: 'Recognized Revenue',
      desc: 'Explore the sanctioned GAAP Attested Computation metric.',
      prompt: 'How is recognized company revenue computed?',
      icon: Calculator,
      glass: 'glass-teal',
      iconColor: 'text-teal-400',
    },
    {
      title: 'Data Governance & GDPR',
      desc: 'Review data classification and 90-day access log purge.',
      prompt: 'What are the data retention and log purge schedules under GDPR?',
      icon: ShieldCheck,
      glass: 'glass-amber',
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto h-full">

      {/* Floating hero icon */}
      <div className="relative mb-8 animate-glass-appear">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-3xl blur-2xl bg-blue-500/15 scale-125" />
        <div className="relative w-20 h-20 rounded-3xl glass-blue flex items-center justify-center shadow-2xl">
          <BookOpen className="w-9 h-9 text-blue-400" />
          {/* Top specular shine */}
          <div className="absolute top-1 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
        </div>
      </div>

      {/* Headline */}
      <div className="animate-glass-appear" style={{ animationDelay: '80ms' }}>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100 mb-3">
          Open Knowledge{' '}
          <span className="gradient-text-blue">Assistant</span>
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-3 leading-relaxed">
          Powered by Llama 3.2 · Grounded in OKF v0.2
        </p>
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <span className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full glass text-slate-300 font-medium">
            <Sparkles className="w-3 h-3 text-violet-400" />
            Zero hallucination
          </span>
          <span className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full glass text-slate-300 font-medium">
            <ShieldCheck className="w-3 h-3 text-teal-400" />
            Source-cited answers
          </span>
        </div>
      </div>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full stagger-children">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className={`p-4 text-left rounded-2xl ${item.glass} hover:scale-[1.02] hover:brightness-110 transition-all duration-200 group relative overflow-hidden`}
            >
              {/* Specular top highlight */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${item.iconColor} group-hover:scale-110 transition-transform`} />
                </div>
                <span className="text-sm font-semibold text-slate-100">
                  {item.title}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed pl-[42px]">
                {item.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Bottom tip */}
      <p className="mt-8 text-xs text-slate-500 animate-glass-appear" style={{ animationDelay: '400ms' }}>
        Or attach a file to extract, index, and query it through OKF RAG
      </p>
    </div>
  );
};

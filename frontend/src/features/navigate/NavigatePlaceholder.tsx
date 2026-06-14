/**
 * NavigatePlaceholder.tsx
 * Shown when a user visits /navigate without an assessment ID.
 * Guides them to complete an assessment first.
 */

import { Link } from 'react-router-dom'
import { ClipboardList, ArrowRight, Recycle, Wrench } from 'lucide-react'

export default function NavigatePlaceholder() {
  return (
    <div className="min-h-screen bg-section-roadmap flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-divider bg-surface shadow-sm">
            <ClipboardList className="h-9 w-9 text-muted" />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink">
              <ArrowRight className="h-3 w-3 text-surface" />
            </span>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink">No roadmap yet</h1>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Your personalised repair or recycle roadmap is generated after
            you assess your device. Take the assessment first and your
            step-by-step guide will appear here.
          </p>
        </div>

        {/* CTA */}
        <Link
          to="/assess"
          className="btn-purple flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold"
        >
          Start your assessment
          <ArrowRight className="h-4 w-4" />
        </Link>

        {/* What you'll get */}
        <div className="mt-8 rounded-xl border border-divider bg-surface p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">
            What you'll get
          </p>
          <div className="space-y-3">
            {[
              {
                icon: <Wrench className="h-4 w-4" />,
                title: 'Repair roadmap',
                desc: 'Step-by-step guide to fix your device — DIY or shop.',
              },
              {
                icon: <Recycle className="h-4 w-4" />,
                title: 'Recycle roadmap',
                desc: 'Safe data wipe and drop-off checklist for certified e-waste facilities.',
              },
              {
                icon: <ClipboardList className="h-4 w-4" />,
                title: 'Personalised to your device',
                desc: 'Steps are filtered by your issue, device age, and repair difficulty.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-divider bg-canvas text-muted">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <p className="text-xs text-muted leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

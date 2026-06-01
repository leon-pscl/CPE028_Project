import { type ReactNode } from 'react'
import { Globe } from 'lucide-react'
import { Link } from 'react-router-dom'

type AuthLayoutProps = {
  children: ReactNode
  /** Hide the home link in the gray panel (useful for confirmation states). */
  hideHomeLink?: boolean
}

export default function AuthLayout({ children, hideHomeLink }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-canvas md:grid-cols-[3fr_2fr] lg:grid-cols-[1.4fr_1fr]">
      {/* Left: image placeholder — fill with art / brand visual later */}
      <aside
        aria-hidden={hideHomeLink ? 'true' : undefined}
        className="relative hidden bg-placeholder md:block"
      >
        {!hideHomeLink && (
          <Link
            to="/"
            className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-surface/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink backdrop-blur transition-opacity hover:opacity-80 cursor-pointer"
          >
            ← Rev.Tech
          </Link>
        )}
      </aside>

      {/* Right: content / form */}
      <section className="relative flex flex-col bg-surface">
        {/* Language switcher */}
        <div className="flex justify-end px-6 pt-6 sm:px-10">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink hover:opacity-70 transition-opacity cursor-pointer"
            aria-label="Change language"
          >
            English (US)
            <Globe className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 pt-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
    </div>
  )
}

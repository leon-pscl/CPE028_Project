import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type Section = {
  id: string
  kicker?: string
  heading: string
  body: string
  cta?: { label: string; to: string }
}

const sections: Section[] = [
  {
    id: 'hero',
    heading: 'To repair or to recycle, that is the question.',
    body: 'Rev.Tech helps makes informed decisions about end-of-life and defective smartphone and laptops. Get your device assessed, follow a guided roadmap, and connect with local resources.',
    cta: { label: 'Get Started', to: '/assess' },
  },
  {
    id: 'assess',
    kicker: 'Assessment',
    heading: 'Is it still worth it?\nor is it time to let go?',
    body: 'Tell us about your device, and Rev.Tech gives you a clear, data-backed recommendation on whether fixing your device or letting it go is the better move.',
  },
  {
    id: 'roadmap',
    kicker: 'Roadmap',
    heading: 'This is the way.',
    body: 'After assessment, Rev.Tech will guide you on the steps you can take, from DIY fixes, to points wherein you need experts to help you.',
  },
  {
    id: 'connect',
    kicker: 'Connect',
    heading: 'Let the pros handle this.',
    body: 'Searching for places to repair or recycle your device should not be this hard. Find verified repair shops and e-waste drop-off points near you.',
  },
]

export default function Home() {
  const { user } = useAuth()

  const ctaTo = user ? '/assess' : '/auth/login'

  return (
    <div className="bg-canvas">
      {sections.map((section) => (
        <HomeSection key={section.id} section={section} ctaTo={section.id === 'hero' ? ctaTo : undefined} />
      ))}
      <Footer />
    </div>
  )
}

function HomeSection({ section, ctaTo }: { section: Section; ctaTo?: string }) {
  const { id, kicker, heading, body, cta } = section
  const headingId = `${id}-heading`

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="relative flex min-h-screen items-center"
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-6 py-24 sm:px-10 lg:grid-cols-2 lg:gap-16 lg:px-16">
        {/* Text column */}
        <div className="flex flex-col justify-center max-w-content">
          {kicker && (
            <p className="mb-4 text-sm font-medium tracking-wide text-ink">
              {kicker}
            </p>
          )}
          <h1
            id={headingId}
            className="font-display text-4xl font-extrabold leading-[1.05] tracking-display text-ink sm:text-5xl lg:text-6xl whitespace-pre-line"
          >
            {heading}
          </h1>
          <p className="mt-6 max-w-prose text-base leading-relaxed text-ink sm:text-lg">
            {body}
          </p>

          {cta && (
            <div className="mt-10">
              <p className="mb-4 text-base text-ink">Are you ready for this?</p>
              <Link
                to={ctaTo ?? cta.to}
                className="inline-flex items-center justify-center rounded-full bg-surface px-8 py-3 text-sm font-semibold text-ink shadow-sm ring-1 ring-divider transition-colors hover:bg-canvas cursor-pointer"
              >
                {cta.label}
              </Link>
            </div>
          )}
        </div>

        {/* Image / media placeholder column — fill with art later */}
        <div
          className="hidden lg:block"
          aria-hidden="true"
        />
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-ink text-accent-fg">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-6 py-20 sm:px-10 lg:px-16">
        {/* Wordmark — replace with SVG logo when finalized */}
        <div className="text-center">
          <p className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
            REV.TECH
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-semibold uppercase tracking-[0.12em]">
            <li>
              <a href="#" className="transition-opacity hover:opacity-70 cursor-pointer">
                Terms of Service
              </a>
            </li>
            <li aria-hidden="true" className="h-4 w-px bg-accent-fg/40" />
            <li>
              <a href="#" className="transition-opacity hover:opacity-70 cursor-pointer">
                Privacy Policy
              </a>
            </li>
            <li aria-hidden="true" className="h-4 w-px bg-accent-fg/40" />
            <li>
              <a href="#" className="transition-opacity hover:opacity-70 cursor-pointer">
                Contact Us
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}

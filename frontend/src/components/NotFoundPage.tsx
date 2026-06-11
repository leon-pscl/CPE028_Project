import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <h1 className="text-6xl font-bold text-ink">404</h1>
      <p className="mt-3 text-lg text-muted">Page not found</p>
      <Link to="/" className="btn-accent mt-6 inline-flex">
        Back to Home
      </Link>
    </div>
  )
}

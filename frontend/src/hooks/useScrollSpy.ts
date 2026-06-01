import { useEffect, useState } from 'react'

type Options = {
  /** Margin around the viewport used by IntersectionObserver. */
  rootMargin?: string
  /** When `false`, the hook short-circuits and always returns `null`. */
  enabled?: boolean
}

/**
 * Observes a set of section IDs and returns the ID of the section that is
 * currently most prominent in the viewport. Returns `null` when none match
 * or when `enabled` is false.
 */
export function useScrollSpy(ids: readonly string[], options: Options = {}): string | null {
  const { rootMargin = '-40% 0px -55% 0px', enabled = true } = options
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || ids.length === 0 || typeof window === 'undefined') {
      setActive(null)
      return
    }

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) {
          setActive(visible[0].target.id)
        }
      },
      { rootMargin, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids, rootMargin, enabled])

  return active
}

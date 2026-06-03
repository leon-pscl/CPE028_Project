import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [pct, setPct] = useState(0)
  const pctRef = useRef(0)
  const fillRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const wipeRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const doneRef = useRef(false)

  useEffect(() => {
    const fill = fillRef.current
    const label = labelRef.current
    const loader = loaderRef.current
    if (!fill || !label || !loader) return

    function getH() {
      return loader!.getBoundingClientRect().height
    }

    function tick() {
      if (!fill || !label) return
      pctRef.current = Math.min(100, pctRef.current + 2 * 0.18)
      const h = getH()

      // Fill shrinks from top to bottom
      const fillH = ((100 - pctRef.current) / 100) * h
      fill.style.height = fillH + 'px'

      // Label sits at the bottom edge of the fill
      label.style.top = (fillH + 8) + 'px'

      setPct(Math.floor(pctRef.current))

      if (pctRef.current < 100) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setPct(100)
        fill.style.height = '0px'
        label.style.top = '8px'
        if (!doneRef.current) {
          doneRef.current = true
          setTimeout(() => {
            gsap.to(wipeRef.current, {
              left: '0%',
              duration: 0.6,
              ease: 'power4.inOut',
              onComplete: () => {
                setTimeout(onComplete, 400)
              },
            })
          }, 300)
        }
      }
    }

    // Initialize: fill covers full height, label at the bottom of fill
    const h = getH()
    fill.style.height = h + 'px'
    label.style.top = (h + 8) + 'px'
    fill.style.transition = 'none'
    label.style.transition = 'none'

    // Reset wipe panel off-screen
    if (wipeRef.current) {
      wipeRef.current.style.left = '100%'
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafRef.current)
  }, [onComplete])

  return (
    <div ref={loaderRef} className="fixed inset-0 z-50 overflow-hidden" style={{ background: '#f9f9f7' }}>
      {/* Color bar track */}
      <div
        className="absolute top-0 right-0 h-full flex flex-col"
        style={{ width: 36 }}
      >
        <div className="flex-1" style={{ background: '#e8d8f0' }} />
        <div className="flex-1" style={{ background: '#d4e8c8' }} />
        <div className="flex-1" style={{ background: '#eee8b8' }} />
      </div>

      {/* Progress fill — shrinks from top to bottom, revealing colors */}
      <div
        ref={fillRef}
        className="absolute top-0 right-0"
        style={{ width: 36, background: '#f9f9f7' }}
      />

      {/* Label — rides the bottom edge of the fill, moving down */}
      <div
        ref={labelRef}
        className="absolute flex flex-col items-end"
        style={{ right: 52 }}
      >
        <div style={{ fontSize: 36, fontWeight: 700, color: '#1e1e2e', lineHeight: 1 }}>
          {pct}<span style={{ fontSize: 18, fontWeight: 400 }}>%</span>
        </div>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 2, letterSpacing: '0.02em' }}>
          Loading…
        </div>
      </div>

      {/* Wipe panel — slides in from the right after loading completes */}
      <div
        ref={wipeRef}
        className="absolute top-0 h-full flex items-center justify-center"
        style={{
          width: '100%',
          left: '100%',
          background: '#f0f0ef',
        }}
      >
        <div className="text-center">
          <h2 style={{ fontSize: 22, fontWeight: 500, color: '#1e1e2e', marginBottom: 8 }}>
            Ready.
          </h2>
          <p style={{ fontSize: 14, color: '#888' }}>
            The next screen has loaded.
          </p>
        </div>
      </div>
    </div>
  )
}

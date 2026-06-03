import { useEffect, useState } from 'react'

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          onComplete()
          return prev
        }
        return prev + Math.random() * 10
      })
    }, 50)

    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-50 bg-surface flex items-end justify-end pb-4 pr-4">
      <div className="relative w-0.5 h-[80vh] bg-gradient-to-t from-green-400 via-yellow-400 to-purple-400 animate-pulse" />
      <div className="absolute bottom-4 right-4 text-ink font-display text-2xl">
        {Math.round(progress)}%
      </div>
    </div>
  )
}
import {
  Home as HomeIcon,
  ClipboardList,
  Presentation,
  MapPin,
  type LucideIcon,
} from 'lucide-react'

/**
 * Primary navigation items. Each item maps to a route and (optionally) to a
 * section anchor on the home page so the sidebar can highlight via scroll-spy.
 */
export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** ID of the corresponding section on the home page (`/`). */
  homeSectionId?: string
}

export const primaryNav: NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon, homeSectionId: 'hero' },
  { to: '/assess', label: 'Assessment', icon: ClipboardList, homeSectionId: 'assess' },
  { to: '/navigate', label: 'Roadmap', icon: Presentation, homeSectionId: 'roadmap' },
  { to: '/connect', label: 'Connect', icon: MapPin, homeSectionId: 'connect' },
]

export const homeSectionIds = primaryNav
  .map((item) => item.homeSectionId)
  .filter((id): id is string => Boolean(id))

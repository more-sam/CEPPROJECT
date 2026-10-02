import {
  ClipboardCheck,
  Compass,
  FileText,
  LayoutDashboard,
  Route,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Short description used by the mobile drawer. */
  hint: string
}

/** Single source of truth for the sidebar and the mobile drawer. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Your overview' },
  { to: '/profile', label: 'Profile', icon: UserRound, hint: 'Your details and skills' },
  { to: '/resume', label: 'Resume Analysis', icon: FileText, hint: 'Upload and extract skills' },
  { to: '/opportunities', label: 'Opportunities', icon: Compass, hint: 'Browse and filter roles' },
  { to: '/skill-gap', label: 'Skill Gap', icon: Target, hint: 'What is missing' },
  { to: '/roadmap', label: 'Learning Roadmap', icon: Route, hint: 'Your ordered path' },
  { to: '/assessments', label: 'Assessments', icon: ClipboardCheck, hint: 'Test your skills' },
  { to: '/progress', label: 'Progress', icon: TrendingUp, hint: 'Track your growth' },
  { to: '/assistant', label: 'AI Career Assistant', icon: Sparkles, hint: 'Ask anything' },
  { to: '/settings', label: 'Settings', icon: Settings, hint: 'Account and data' },
]

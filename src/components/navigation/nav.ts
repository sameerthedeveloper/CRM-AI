import { Building2, CheckSquare, Handshake, LayoutDashboard, MessageCircle, Settings, Users, UserRound, Activity, type LucideIcon } from 'lucide-react'

export interface NavItem { to: string; label: string; icon: LucideIcon; key: string }

export const PRIMARY: NavItem[] = [
  { to: '/chat', label: 'Chat', icon: MessageCircle, key: 'c' },
  { to: '/dashboard', label: 'Today', icon: LayoutDashboard, key: 'd' },
]
export const CRM_NAV: NavItem[] = [
  { to: '/leads', label: 'Leads', icon: Users, key: 'l' },
  { to: '/contacts', label: 'Contacts', icon: UserRound, key: 'o' },
  { to: '/companies', label: 'Companies', icon: Building2, key: 'm' },
  { to: '/deals', label: 'Deals', icon: Handshake, key: 'p' },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, key: 't' },
  { to: '/activities', label: 'Activities', icon: Activity, key: 'a' },
]
export const SETTINGS_NAV: NavItem = { to: '/settings', label: 'Settings', icon: Settings, key: 's' }
export const ALL_NAV = [...PRIMARY, ...CRM_NAV, SETTINGS_NAV]

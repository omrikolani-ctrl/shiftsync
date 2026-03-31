'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type Role } from '@/types'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  LogOut,
  CalendarDays,
  Zap,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const employeeLinks = [
  { href: '/dashboard', label: 'Home',     icon: LayoutDashboard },
  { href: '/schedule',  label: 'My Schedule', icon: Calendar },
  { href: '/requests',  label: 'Requests', icon: FileText },
]

const schedulerLinks = [
  { href: '/dashboard', label: 'Home',     icon: LayoutDashboard },
  { href: '/requests',  label: 'Requests', icon: FileText },
  { href: '/schedule',  label: 'Schedule', icon: Calendar },
  { href: '/team',      label: 'Team',     icon: Users },
]

interface Props {
  fullName: string
  role: Role
  pendingCount?: number
}

export function SidebarNav({ fullName, role, pendingCount = 0 }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const links = role === 'employee' ? employeeLinks : schedulerLinks

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0"
      style={{ background: 'linear-gradient(180deg, oklch(0.22 0.08 258) 0%, oklch(0.18 0.06 255) 100%)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="bg-blue-400/20 border border-blue-400/30 rounded-xl p-2">
          <Zap className="h-5 w-5 text-blue-300" />
        </div>
        <div>
          <span className="font-extrabold text-white tracking-tight text-lg">ShiftSync</span>
          <p className="text-blue-300/70 text-[10px] font-medium uppercase tracking-widest -mt-0.5">Scheduling</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-6 mb-4">
        <span className="inline-flex items-center gap-1.5 bg-blue-400/15 border border-blue-400/20 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full capitalize">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          {role}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
                active
                  ? 'bg-white text-blue-700 shadow-md shadow-black/20'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {label === 'Requests' && pendingCount > 0 && (
                <Badge className={cn('ml-auto text-xs px-1.5 py-0', active ? 'bg-blue-600 text-white' : 'bg-blue-400/30 text-blue-200 border-0')}>
                  {pendingCount}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-5 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3 px-3">
          <Avatar className="h-9 w-9 border-2 border-blue-400/30">
            <AvatarFallback className="bg-blue-500/30 text-blue-100 text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{fullName}</p>
            <p className="text-xs text-blue-300 capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

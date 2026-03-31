'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type Role } from '@/types'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Calendar, FileText, Users, CalendarDays, LogOut } from 'lucide-react'

const employeeLinks = [
  { href: '/dashboard', label: 'Home',     icon: LayoutDashboard },
  { href: '/schedule',  label: 'Schedule', icon: CalendarDays },
  { href: '/requests',  label: 'Requests', icon: FileText },
]

const schedulerLinks = [
  { href: '/dashboard', label: 'Home',     icon: LayoutDashboard },
  { href: '/requests',  label: 'Requests', icon: FileText },
  { href: '/schedule',  label: 'Schedule', icon: Calendar },
  { href: '/team',      label: 'Team',     icon: Users },
]

interface Props {
  role: Role
  pendingCount?: number
}

export function MobileNav({ role, pendingCount = 0 }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const links = role === 'employee' ? employeeLinks : schedulerLinks

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-blue-100 flex shadow-lg shadow-blue-900/10">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors relative',
              active ? 'text-blue-600' : 'text-gray-400 hover:text-blue-500'
            )}
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-blue-600" />
            )}
            <div className="relative">
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              {label === 'Requests' && pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </div>
            {label}
          </Link>
        )
      })}
      <button
        onClick={handleSignOut}
        className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
      >
        <LogOut className="h-5 w-5" />
        Sign out
      </button>
    </nav>
  )
}

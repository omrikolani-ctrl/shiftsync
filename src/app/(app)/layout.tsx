import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarNav } from '@/components/layout/sidebar-nav'
import { MobileNav } from '@/components/layout/mobile-nav'
import { type Role } from '@/types'
import { Toaster } from '@/components/ui/sonner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Pending request count for schedulers
  let pendingCount = 0
  if (profile.role !== 'employee') {
    const { count } = await supabase
      .from('time_off_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    pendingCount = count ?? 0
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav
        fullName={profile.full_name}
        role={profile.role as Role}
        pendingCount={pendingCount}
      />
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <MobileNav role={profile.role as Role} pendingCount={pendingCount} />
      <Toaster />
    </div>
  )
}

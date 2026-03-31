import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, endOfWeek, isToday } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import {
  Clock,
  CalendarCheck,
  CalendarX,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Timer,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isScheduler = profile.role !== 'employee'
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  if (isScheduler) {
    // Scheduler dashboard
    const [
      { count: pendingTOR },
      { count: pendingSwaps },
      { data: todayAssignments },
      { data: recentRequests },
    ] = await Promise.all([
      supabase.from('time_off_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('swap_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase
        .from('shift_assignments')
        .select('*, profile:profiles(full_name), shift:shifts(name, start_time, end_time)')
        .eq('date', todayStr),
      supabase
        .from('time_off_requests')
        .select('*, profile:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Good {getGreeting()}, {profile.full_name.split(' ')[0]}</h1>
          <p className="text-muted-foreground">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Pending Requests"
            value={(pendingTOR ?? 0) + (pendingSwaps ?? 0)}
            icon={<Timer className="h-4 w-4" />}
            href="/requests"
            urgent={(pendingTOR ?? 0) + (pendingSwaps ?? 0) > 0}
          />
          <StatCard
            title="Time Off Pending"
            value={pendingTOR ?? 0}
            icon={<CalendarX className="h-4 w-4" />}
            href="/requests"
          />
          <StatCard
            title="Swap Pending"
            value={pendingSwaps ?? 0}
            icon={<Users className="h-4 w-4" />}
            href="/requests"
          />
          <StatCard
            title="Working Today"
            value={todayAssignments?.length ?? 0}
            icon={<CalendarCheck className="h-4 w-4" />}
            href="/schedule"
          />
        </div>

        {/* Today's staffing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today&apos;s Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAssignments && todayAssignments.length > 0 ? (
              <div className="space-y-2">
                {todayAssignments.slice(0, 8).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{a.profile?.full_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{a.shift?.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {a.shift?.start_time?.slice(0,5)} – {a.shift?.end_time?.slice(0,5)}
                      </Badge>
                    </div>
                  </div>
                ))}
                {todayAssignments.length > 8 && (
                  <p className="text-xs text-muted-foreground">+{todayAssignments.length - 8} more</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                No shifts assigned for today
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Requests</CardTitle>
            <Link href="/requests" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>View all</Link>
          </CardHeader>
          <CardContent>
            {recentRequests && recentRequests.length > 0 ? (
              <div className="space-y-3">
                {recentRequests.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{r.profile?.full_name}</p>
                      <p className="text-muted-foreground text-xs capitalize">
                        {r.type} · {format(new Date(r.start_date), 'MMM d')} – {format(new Date(r.end_date), 'MMM d')}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No requests yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Employee dashboard
  const [
    { data: upcomingShifts },
    { data: myRequests },
  ] = await Promise.all([
    supabase
      .from('shift_assignments')
      .select('*, shift:shifts(name, start_time, end_time)')
      .eq('employee_id', user.id)
      .gte('date', todayStr)
      .lte('date', weekEnd)
      .order('date'),
    supabase
      .from('time_off_requests')
      .select('*')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hi, {profile.full_name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">{format(today, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/requests?new=time-off" className={buttonVariants({ className: 'h-14 flex-col gap-1' })}>
          <CalendarX className="h-5 w-5" />
          <span className="text-xs">Request Time Off</span>
        </Link>
        <Link href="/requests?new=swap" className={buttonVariants({ variant: 'outline', className: 'h-14 flex-col gap-1' })}>
          <Users className="h-5 w-5" />
          <span className="text-xs">Request Swap</span>
        </Link>
      </div>

      {/* This week's shifts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">This Week&apos;s Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingShifts && upcomingShifts.length > 0 ? (
            <div className="space-y-2">
              {upcomingShifts.map((a: any) => {
                const shiftDate = new Date(a.date + 'T00:00:00')
                return (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                      isToday(shiftDate) ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                  >
                    <div>
                      <p className="font-medium flex items-center gap-1.5">
                        {format(shiftDate, 'EEE, MMM d')}
                        {isToday(shiftDate) && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">Today</Badge>
                        )}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {a.shift?.name} · {a.shift?.start_time?.slice(0,5)} – {a.shift?.end_time?.slice(0,5)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No shifts this week</p>
          )}
        </CardContent>
      </Card>

      {/* My requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">My Requests</CardTitle>
          <Link href="/requests" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>View all</Link>
        </CardHeader>
        <CardContent>
          {myRequests && myRequests.length > 0 ? (
            <div className="space-y-3">
              {myRequests.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium capitalize">{r.type}</p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(r.start_date), 'MMM d')} – {format(new Date(r.end_date), 'MMM d')}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No requests yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon, href, urgent }: {
  title: string
  value: number
  icon: React.ReactNode
  href: string
  urgent?: boolean
}) {
  return (
    <Link href={href}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer ${urgent ? 'border-orange-300' : ''}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-muted-foreground ${urgent ? 'text-orange-500' : ''}`}>{icon}</span>
            {urgent && <span className="h-2 w-2 rounded-full bg-orange-500" />}
          </div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return (
    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
      <CheckCircle2 className="h-3 w-3" />Approved
    </Badge>
  )
  if (status === 'rejected') return (
    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 gap-1">
      <XCircle className="h-3 w-3" />Rejected
    </Badge>
  )
  return (
    <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 gap-1">
      <Timer className="h-3 w-3" />Pending
    </Badge>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

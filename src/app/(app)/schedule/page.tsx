import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { ScheduleCalendar } from '@/components/scheduler/schedule-calendar'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const params = await searchParams
  const now = new Date()
  const year = parseInt(params.year ?? String(now.getFullYear()))
  const month = parseInt(params.month ?? String(now.getMonth() + 1))
  const viewDate = new Date(year, month - 1, 1)

  const monthStart = format(startOfMonth(viewDate), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(viewDate), 'yyyy-MM-dd')

  const isScheduler = profile.role !== 'employee'

  let query = supabase
    .from('shift_assignments')
    .select('*, shift:shifts(name, start_time, end_time), profile:profiles(full_name)')
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .order('date')

  if (!isScheduler) query = query.eq('employee_id', user.id)

  const { data: assignments } = await query

  const byDate: Record<string, typeof assignments> = {}
  assignments?.forEach(a => {
    if (!byDate[a.date]) byDate[a.date] = []
    byDate[a.date]!.push(a as any)
  })

  const days = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) })
  const firstDayOfWeek = (getDay(days[0]) + 6) % 7
  const dayStrings = days.map(d => format(d, 'yyyy-MM-dd'))

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isScheduler ? 'Schedule Manager' : 'My Schedule'}</h1>
          <p className="text-muted-foreground">
            {format(viewDate, 'MMMM yyyy')}
            {isScheduler && <span className="ml-2 text-xs text-blue-500 font-medium">· Click any day to assign shifts</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/schedule?year=${prevMonth.year}&month=${prevMonth.month}`}
            className="px-3 py-1.5 border rounded-lg text-sm font-medium hover:bg-muted transition-colors">←</a>
          <a href={`/schedule?year=${now.getFullYear()}&month=${now.getMonth() + 1}`}
            className="px-3 py-1.5 border rounded-lg text-sm font-medium hover:bg-muted transition-colors">Today</a>
          <a href={`/schedule?year=${nextMonth.year}&month=${nextMonth.month}`}
            className="px-3 py-1.5 border rounded-lg text-sm font-medium hover:bg-muted transition-colors">→</a>
        </div>
      </div>

      {/* Interactive calendar */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <ScheduleCalendar
            days={dayStrings}
            firstDayOfWeek={firstDayOfWeek}
            byDate={byDate as any}
            isScheduler={isScheduler}
          />
        </CardContent>
      </Card>

      {/* Assignment list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isScheduler ? 'All Assignments' : 'My Shifts'} — {format(viewDate, 'MMMM')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments && assignments.length > 0 ? (
            <div className="space-y-2">
              {assignments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border text-sm">
                  <div>
                    <p className="font-semibold">
                      {format(new Date(a.date + 'T00:00:00'), 'EEE, MMM d')}
                      {isScheduler && (
                        <span className="text-muted-foreground font-normal"> · {a.profile?.full_name}</span>
                      )}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1 text-xs mt-0.5">
                      <Clock className="h-3 w-3" />
                      {a.shift?.name} · {a.shift?.start_time?.slice(0,5)} – {a.shift?.end_time?.slice(0,5)}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">{a.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isScheduler ? 'No shifts assigned this month. Click a day on the calendar to get started.' : 'No shifts this month.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

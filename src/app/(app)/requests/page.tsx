import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, XCircle, Clock, CalendarOff, ArrowLeftRight, Plus } from 'lucide-react'
import { TimeOffRequestDialog } from '@/components/employee/time-off-request-dialog'
import { SwapRequestDialog } from '@/components/employee/swap-request-dialog'
import { RequestActions } from '@/components/scheduler/request-actions'

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isScheduler = profile.role !== 'employee'
  const params = await searchParams
  const openNew = params.new

  const [{ data: timeOffRequests }, { data: swapRequests }] = await Promise.all([
    supabase
      .from('time_off_requests')
      .select('*, profile:profiles!time_off_requests_employee_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .match(isScheduler ? {} : { employee_id: user.id }),
    supabase
      .from('swap_requests')
      .select('*, requester:profiles!swap_requests_requester_id_fkey(full_name), target:profiles!swap_requests_target_id_fkey(full_name)')
      .order('created_at', { ascending: false }),
  ])

  const pendingTOR = timeOffRequests?.filter(r => r.status === 'pending') ?? []
  const pendingSwaps = swapRequests?.filter(r => r.status === 'pending') ?? []

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Requests</h1>
          <p className="text-muted-foreground text-sm">
            {isScheduler
              ? `${pendingTOR.length + pendingSwaps.length} pending review`
              : 'Manage your time off and shift swaps'}
          </p>
        </div>
        {!isScheduler && (
          <div className="flex gap-2">
            <SwapRequestDialog defaultOpen={openNew === 'swap'} />
            <TimeOffRequestDialog defaultOpen={openNew === 'time-off'} />
          </div>
        )}
      </div>

      {/* Summary cards for scheduler */}
      {isScheduler && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarOff className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-700">Time Off</span>
            </div>
            <p className="text-3xl font-extrabold text-orange-600">{pendingTOR.length}</p>
            <p className="text-xs text-orange-400 mt-0.5">pending approval</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowLeftRight className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-bold text-purple-700">Swaps</span>
            </div>
            <p className="text-3xl font-extrabold text-purple-600">{pendingSwaps.length}</p>
            <p className="text-xs text-purple-400 mt-0.5">pending approval</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="time-off">
        <TabsList className="w-full">
          <TabsTrigger value="time-off" className="flex-1 gap-1.5">
            <CalendarOff className="h-3.5 w-3.5" />
            Time Off
            {isScheduler && pendingTOR.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{pendingTOR.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="swaps" className="flex-1 gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Swaps
            {isScheduler && pendingSwaps.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{pendingSwaps.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TIME OFF TAB */}
        <TabsContent value="time-off" className="space-y-3 mt-4">
          {!isScheduler && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Requests</p>
            </div>
          )}
          {timeOffRequests && timeOffRequests.length > 0 ? (
            timeOffRequests.map((r: any) => (
              <Card key={r.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className={`h-1 w-full ${
                    r.status === 'approved' ? 'bg-green-400' :
                    r.status === 'rejected' ? 'bg-red-400' : 'bg-orange-400'
                  }`} />
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {isScheduler && (
                        <p className="font-bold text-sm">{r.profile?.full_name}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <TypeBadge type={r.type} />
                        <span className="text-sm font-medium">
                          {format(new Date(r.start_date), 'MMM d')} – {format(new Date(r.end_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {r.reason && (
                        <p className="text-sm text-muted-foreground">{r.reason}</p>
                      )}
                      {r.manager_note && (
                        <p className="text-xs bg-muted rounded-lg px-3 py-2 text-muted-foreground">
                          Note: {r.manager_note}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge status={r.status} />
                      {isScheduler && r.status === 'pending' && (
                        <RequestActions requestId={r.id} type="time-off" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={<CalendarOff className="h-8 w-8 text-muted-foreground/30" />}
              title={isScheduler ? 'No time off requests' : 'No requests yet'}
              subtitle={isScheduler ? 'All caught up!' : 'Tap "New Request" to submit time off'}
            />
          )}
        </TabsContent>

        {/* SWAPS TAB */}
        <TabsContent value="swaps" className="space-y-3 mt-4">
          {swapRequests && swapRequests.length > 0 ? (
            swapRequests.map((r: any) => (
              <Card key={r.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className={`h-1 w-full ${
                    r.status === 'approved' ? 'bg-green-400' :
                    r.status === 'rejected' || r.status === 'rejected_by_target' ? 'bg-red-400' : 'bg-purple-400'
                  }`} />
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm">
                        <span className="font-bold">{r.requester?.full_name}</span>
                        <span className="text-muted-foreground"> → </span>
                        <span className="font-bold">{r.target?.full_name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge status={r.status} />
                      {isScheduler && (r.status === 'pending' || r.status === 'accepted_by_target') && (
                        <RequestActions requestId={r.id} type="swap" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={<ArrowLeftRight className="h-8 w-8 text-muted-foreground/30" />}
              title="No swap requests"
              subtitle={isScheduler ? 'All caught up!' : 'No shift swaps pending'}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    vacation: 'bg-blue-50 text-blue-600 border-blue-100',
    sick: 'bg-red-50 text-red-600 border-red-100',
    personal: 'bg-purple-50 text-purple-600 border-purple-100',
    other: 'bg-gray-50 text-gray-600 border-gray-100',
  }
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border capitalize ${colors[type] ?? colors.other}`}>
      {type}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return (
    <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 border border-green-100 rounded-full px-2.5 py-0.5">
      <CheckCircle2 className="h-3 w-3" />Approved
    </span>
  )
  if (status === 'rejected' || status === 'rejected_by_target') return (
    <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5">
      <XCircle className="h-3 w-3" />Rejected
    </span>
  )
  if (status === 'accepted_by_target') return (
    <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
      <Clock className="h-3 w-3" />Awaiting manager
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2.5 py-0.5">
      <Clock className="h-3 w-3" />Pending
    </span>
  )
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3">{icon}</div>
      <p className="font-bold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  )
}

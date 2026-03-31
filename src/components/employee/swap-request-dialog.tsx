'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'

interface Props {
  defaultOpen?: boolean
}

export function SwapRequestDialog({ defaultOpen = false }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(defaultOpen)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  const [myShifts, setMyShifts] = useState<any[]>([])
  const [selectedMyShiftId, setSelectedMyShiftId] = useState('')

  const [colleagues, setColleagues] = useState<any[]>([])
  const [selectedColleagueId, setSelectedColleagueId] = useState('')

  const [colleagueShifts, setColleagueShifts] = useState<any[]>([])
  const [selectedColleagueShiftId, setSelectedColleagueShiftId] = useState('')

  useEffect(() => {
    if (!open) return
    async function loadInitialData() {
      setLoadingData(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = format(new Date(), 'yyyy-MM-dd')
      const future = format(addDays(new Date(), 60), 'yyyy-MM-dd')

      const [{ data: shifts }, { data: profiles }] = await Promise.all([
        supabase
          .from('shift_assignments')
          .select('*, shift:shifts(name, start_time, end_time)')
          .eq('employee_id', user.id)
          .gte('date', today)
          .lte('date', future)
          .order('date'),
        supabase
          .from('profiles')
          .select('id, full_name')
          .neq('id', user.id)
          .order('full_name'),
      ])

      setMyShifts(shifts ?? [])
      setColleagues(profiles ?? [])
      setLoadingData(false)
    }
    loadInitialData()
  }, [open])

  useEffect(() => {
    if (!selectedColleagueId) {
      setColleagueShifts([])
      setSelectedColleagueShiftId('')
      return
    }
    async function loadColleagueShifts() {
      const today = format(new Date(), 'yyyy-MM-dd')
      const future = format(addDays(new Date(), 60), 'yyyy-MM-dd')
      const { data: shifts } = await supabase
        .from('shift_assignments')
        .select('*, shift:shifts(name, start_time, end_time)')
        .eq('employee_id', selectedColleagueId)
        .gte('date', today)
        .lte('date', future)
        .order('date')
      setColleagueShifts(shifts ?? [])
      setSelectedColleagueShiftId('')
    }
    loadColleagueShifts()
  }, [selectedColleagueId])

  function formatShiftLabel(a: any) {
    return `${format(new Date(a.date + 'T00:00:00'), 'EEE, MMM d')} · ${a.shift?.name} (${a.shift?.start_time?.slice(0, 5)}–${a.shift?.end_time?.slice(0, 5)})`
  }

  function resetForm() {
    setSelectedMyShiftId('')
    setSelectedColleagueId('')
    setSelectedColleagueShiftId('')
    setColleagueShifts([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('swap_requests').insert({
      requester_id: user.id,
      target_id: selectedColleagueId,
      requester_shift_id: selectedMyShiftId,
      target_shift_id: selectedColleagueShiftId,
      status: 'pending',
    })

    if (error) {
      toast.error('Failed to send request: ' + error.message)
    } else {
      toast.success('Swap request sent!')
      setOpen(false)
      resetForm()
      router.refresh()
    }
    setLoading(false)
  }

  const canSubmit = selectedMyShiftId && selectedColleagueId && selectedColleagueShiftId

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <ArrowLeftRight className="h-4 w-4 mr-1.5" />
            Request Swap
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Shift Swap</DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading shifts…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* My shift */}
            <div className="space-y-1.5">
              <Label>My shift to give away</Label>
              <Select value={selectedMyShiftId} onValueChange={(v) => v && setSelectedMyShiftId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick one of your shifts…" />
                </SelectTrigger>
                <SelectContent>
                  {myShifts.length === 0 ? (
                    <SelectItem value="_none" disabled>No upcoming shifts</SelectItem>
                  ) : (
                    myShifts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{formatShiftLabel(a)}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Colleague */}
            <div className="space-y-1.5">
              <Label>Swap with</Label>
              <Select value={selectedColleagueId} onValueChange={(v) => v && setSelectedColleagueId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a colleague…" />
                </SelectTrigger>
                <SelectContent>
                  {colleagues.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Colleague's shift — shown after colleague is picked */}
            {selectedColleagueId && (
              <div className="space-y-1.5">
                <Label>Their shift to take</Label>
                <Select value={selectedColleagueShiftId} onValueChange={(v) => v && setSelectedColleagueShiftId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick their shift…" />
                  </SelectTrigger>
                  <SelectContent>
                    {colleagueShifts.length === 0 ? (
                      <SelectItem value="_none" disabled>No upcoming shifts found</SelectItem>
                    ) : (
                      colleagueShifts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{formatShiftLabel(a)}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !canSubmit}>
                {loading ? 'Sending…' : 'Send Request'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

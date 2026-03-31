'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Trash2, Plus, Clock, User } from 'lucide-react'

interface Assignment {
  id: string
  employee_id: string
  shift_id: string
  profile?: { full_name: string }
  shift?: { name: string; start_time: string; end_time: string }
}

interface Props {
  date: string
  assignments: Assignment[]
  isOpen: boolean
  onClose: () => void
}

export function AssignShiftDialog({ date, assignments: initialAssignments, isOpen, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([])
  const [shifts, setShifts] = useState<{ id: string; name: string; start_time: string; end_time: string }[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedShift, setSelectedShift] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    setAssignments(initialAssignments)
  }, [initialAssignments])

  useEffect(() => {
    if (!isOpen) return
    Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role', 'employee').order('full_name'),
      supabase.from('shifts').select('*').order('start_time'),
    ]).then(([{ data: emps }, { data: shfs }]) => {
      setEmployees(emps ?? [])
      setShifts(shfs ?? [])
    })
  }, [isOpen])

  async function handleAssign() {
    if (!selectedEmployee || !selectedShift) {
      toast.error('Please select both an employee and a shift')
      return
    }
    setLoading(true)

    const { data, error } = await supabase
      .from('shift_assignments')
      .insert({ employee_id: selectedEmployee, shift_id: selectedShift, date })
      .select('*, profile:profiles(full_name), shift:shifts(name, start_time, end_time)')
      .single()

    if (error) {
      if (error.code === '23505') toast.error('Employee already assigned to this shift on this date')
      else toast.error(error.message)
    } else {
      toast.success('Shift assigned!')
      setAssignments(prev => [...prev, data])
      setSelectedEmployee('')
      setSelectedShift('')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete(assignmentId: string) {
    setDeleting(assignmentId)
    const { error } = await supabase.from('shift_assignments').delete().eq('id', assignmentId)
    if (error) {
      toast.error('Failed to remove: ' + error.message)
    } else {
      toast.success('Assignment removed')
      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
      router.refresh()
    }
    setDeleting(null)
  }

  const assignedEmployeeIds = new Set(assignments.map(a => a.employee_id))

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary rounded-lg p-1.5">
              <Clock className="h-4 w-4" />
            </div>
            {format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d')}
          </DialogTitle>
        </DialogHeader>

        {/* Current assignments */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Assigned ({assignments.length})
          </p>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No one assigned yet</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{a.profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.shift?.name} · {a.shift?.start_time?.slice(0,5)}–{a.shift?.end_time?.slice(0,5)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deleting === a.id}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded ml-2 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Assignment</p>

          <div className="space-y-1.5">
            <Label className="text-xs">Employee</Label>
            <Select value={selectedEmployee} onValueChange={v => v && setSelectedEmployee(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select employee…" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="flex items-center gap-2">
                      {e.full_name}
                      {assignedEmployeeIds.has(e.id) && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">assigned</Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Shift</Label>
            <Select value={selectedShift} onValueChange={v => v && setSelectedShift(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select shift…" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleAssign} disabled={loading} className="w-full">
            <Plus className="h-4 w-4 mr-1.5" />
            {loading ? 'Assigning…' : 'Assign Shift'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

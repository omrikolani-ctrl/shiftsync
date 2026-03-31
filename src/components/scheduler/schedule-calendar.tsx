'use client'

import { useState } from 'react'
import { format, isToday, getDay } from 'date-fns'
import { AssignShiftDialog } from './assign-shift-dialog'
import { Plus } from 'lucide-react'

interface Assignment {
  id: string
  date: string
  employee_id: string
  shift_id: string
  profile?: { full_name: string }
  shift?: { name: string; start_time: string; end_time: string }
}

interface Props {
  days: string[]         // ISO date strings for the month
  firstDayOfWeek: number // 0=Mon
  byDate: Record<string, Assignment[]>
  isScheduler: boolean
}

export function ScheduleCalendar({ days, firstDayOfWeek, byDate, isScheduler }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dialogAssignments, setDialogAssignments] = useState<Assignment[]>([])

  function openDay(dateStr: string) {
    if (!isScheduler) return
    setSelectedDate(dateStr)
    setDialogAssignments(byDate[dateStr] ?? [])
  }

  return (
    <>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[100px] border-b border-r bg-muted/10" />
        ))}

        {days.map((dateStr, idx) => {
          const day = new Date(dateStr + 'T00:00:00')
          const dayAssignments = byDate[dateStr] ?? []
          const isWeekend = getDay(day) === 0 || getDay(day) === 6
          const colIndex = (firstDayOfWeek + idx) % 7
          const today = isToday(day)

          return (
            <div
              key={dateStr}
              onClick={() => openDay(dateStr)}
              className={`min-h-[100px] border-b ${colIndex < 6 ? 'border-r' : ''} p-1.5 transition-colors ${
                isScheduler ? 'cursor-pointer hover:bg-primary/5' : ''
              } ${isWeekend ? 'bg-muted/10' : ''} ${today ? 'bg-blue-50' : ''}`}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                  today ? 'bg-primary text-white' : 'text-foreground'
                }`}>
                  {format(day, 'd')}
                </span>
                {isScheduler && (
                  <Plus className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100" />
                )}
              </div>

              {/* Assignments */}
              <div className="space-y-0.5">
                {dayAssignments.slice(0, 3).map(a => (
                  <div
                    key={a.id}
                    className="text-[10px] bg-blue-100 text-blue-700 font-semibold rounded px-1.5 py-0.5 truncate"
                    title={`${a.profile?.full_name} · ${a.shift?.name}`}
                  >
                    {isScheduler
                      ? a.profile?.full_name?.split(' ')[0]
                      : a.shift?.name}
                  </div>
                ))}
                {dayAssignments.length > 3 && (
                  <p className="text-[10px] text-muted-foreground font-medium">
                    +{dayAssignments.length - 3} more
                  </p>
                )}
                {isScheduler && dayAssignments.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/40">+ add</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Assign dialog */}
      {selectedDate && (
        <AssignShiftDialog
          date={selectedDate}
          assignments={dialogAssignments}
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </>
  )
}

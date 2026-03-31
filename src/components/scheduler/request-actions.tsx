'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  requestId: string
  type: 'time-off' | 'swap'
}

export function RequestActions({ requestId, type }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [managerNote, setManagerNote] = useState('')

  async function handleApprove() {
    setLoading('approve')

    const table = type === 'time-off' ? 'time_off_requests' : 'swap_requests'
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from(table)
      .update({
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) {
      toast.error('Failed to approve: ' + error.message)
    } else {
      toast.success('Request approved')
      router.refresh()
    }
    setLoading(null)
  }

  async function handleReject() {
    setLoading('reject')
    const table = type === 'time-off' ? 'time_off_requests' : 'swap_requests'
    const { data: { user } } = await supabase.auth.getUser()

    const updateData: Record<string, unknown> = {
      status: 'rejected',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }
    if (type === 'time-off' && managerNote) {
      updateData.manager_note = managerNote
    }

    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', requestId)

    if (error) {
      toast.error('Failed to reject: ' + error.message)
    } else {
      toast.success('Request rejected')
      setRejectOpen(false)
      setManagerNote('')
      router.refresh()
    }
    setLoading(null)
  }

  return (
    <>
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 border-green-200 hover:bg-green-50 h-7 text-xs"
          onClick={handleApprove}
          disabled={loading !== null}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {loading === 'approve' ? '…' : 'Approve'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
          onClick={() => setRejectOpen(true)}
          disabled={loading !== null}
        >
          <XCircle className="h-3 w-3 mr-1" />
          Reject
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {type === 'time-off' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Note for employee (optional)</label>
                <Textarea
                  placeholder="Reason for rejection..."
                  value={managerNote}
                  onChange={e => setManagerNote(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={loading === 'reject'}
              >
                {loading === 'reject' ? 'Rejecting…' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

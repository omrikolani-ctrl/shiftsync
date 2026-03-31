import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isScheduler = profile?.role !== 'employee'

  const query = supabase
    .from('time_off_requests')
    .select('*, profile:profiles!time_off_requests_employee_id_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (!isScheduler) query.eq('employee_id', user.id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, start_date, end_date, reason } = body

  if (!type || !start_date || !end_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (end_date < start_date) {
    return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('time_off_requests')
    .insert({ employee_id: user.id, type, start_date, end_date, reason })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export type Role = 'employee' | 'scheduler' | 'admin'

export type RequestStatus = 'pending' | 'approved' | 'rejected'

export type TimeOffType = 'vacation' | 'sick' | 'personal' | 'other'

export type SwapStatus =
  | 'pending'
  | 'accepted_by_target'
  | 'rejected_by_target'
  | 'approved'
  | 'rejected'

export type AssignmentStatus = 'scheduled' | 'covered' | 'absent'

export interface Profile {
  id: string
  full_name: string
  role: Role
  phone: string | null
  department: string | null
  created_at: string
}

export interface Shift {
  id: string
  name: string
  start_time: string
  end_time: string
  min_staff: number
  created_at: string
}

export interface ShiftAssignment {
  id: string
  employee_id: string
  shift_id: string
  date: string
  status: AssignmentStatus
  created_by: string | null
  created_at: string
  // joined
  profile?: Profile
  shift?: Shift
}

export interface TimeOffRequest {
  id: string
  employee_id: string
  type: TimeOffType
  start_date: string
  end_date: string
  reason: string | null
  status: RequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  manager_note: string | null
  created_at: string
  // joined
  profile?: Profile
  reviewer?: Profile
}

export interface SwapRequest {
  id: string
  requester_id: string
  target_id: string
  requester_shift: string
  target_shift: string
  status: SwapStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  // joined
  requester?: Profile
  target?: Profile
  requester_assignment?: ShiftAssignment
  target_assignment?: ShiftAssignment
}

export interface Availability {
  id: string
  employee_id: string
  date: string
  is_available: boolean
  note: string | null
}

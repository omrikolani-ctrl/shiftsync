-- =============================================
-- Employee Scheduling System — Initial Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'employee'
                CHECK (role IN ('employee', 'scheduler', 'admin')),
  phone       TEXT,
  department  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts (templates)
CREATE TABLE IF NOT EXISTS shifts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  min_staff    INT DEFAULT 1,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Shift Assignments (who works when)
CREATE TABLE IF NOT EXISTS shift_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_id     UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled', 'covered', 'absent')),
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date, shift_id)
);

-- Time Off Requests
CREATE TABLE IF NOT EXISTS time_off_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'other')),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   UUID REFERENCES profiles(id),
  reviewed_at   TIMESTAMPTZ,
  manager_note  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Shift Swap Requests
CREATE TABLE IF NOT EXISTS swap_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requester_shift_id  UUID NOT NULL REFERENCES shift_assignments(id) ON DELETE CASCADE,
  target_shift_id     UUID NOT NULL REFERENCES shift_assignments(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending',
                          'accepted_by_target',
                          'rejected_by_target',
                          'approved',
                          'rejected'
                        )),
  reviewed_by         UUID REFERENCES profiles(id),
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Availability
CREATE TABLE IF NOT EXISTS availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  note         TEXT,
  UNIQUE(employee_id, date)
);

-- Push Notification Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Seed: Default Shifts
-- =============================================
INSERT INTO shifts (name, start_time, end_time, min_staff) VALUES
  ('Morning',   '07:00', '15:00', 5),
  ('Afternoon', '15:00', '23:00', 5),
  ('Night',     '23:00', '07:00', 3)
ON CONFLICT DO NOTHING;

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability        ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions  ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- profiles: everyone can read all profiles (for name display), only self can update
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- shifts: everyone reads, only scheduler/admin write
CREATE POLICY "shifts_select" ON shifts FOR SELECT USING (true);
CREATE POLICY "shifts_write"  ON shifts FOR ALL
  USING (current_user_role() IN ('scheduler', 'admin'));

-- shift_assignments: employees see own, schedulers see all
CREATE POLICY "assignments_select_own" ON shift_assignments FOR SELECT
  USING (
    employee_id = auth.uid()
    OR current_user_role() IN ('scheduler', 'admin')
  );
CREATE POLICY "assignments_write" ON shift_assignments FOR ALL
  USING (current_user_role() IN ('scheduler', 'admin'));

-- time_off_requests: employees see own, schedulers see all
CREATE POLICY "tor_select" ON time_off_requests FOR SELECT
  USING (
    employee_id = auth.uid()
    OR current_user_role() IN ('scheduler', 'admin')
  );
CREATE POLICY "tor_insert" ON time_off_requests FOR INSERT
  WITH CHECK (employee_id = auth.uid());
CREATE POLICY "tor_update_employee" ON time_off_requests FOR UPDATE
  USING (
    employee_id = auth.uid() AND status = 'pending'
    OR current_user_role() IN ('scheduler', 'admin')
  );

-- swap_requests: requester or target or scheduler
CREATE POLICY "swap_select" ON swap_requests FOR SELECT
  USING (
    requester_id = auth.uid()
    OR target_id = auth.uid()
    OR current_user_role() IN ('scheduler', 'admin')
  );
CREATE POLICY "swap_insert" ON swap_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "swap_update" ON swap_requests FOR UPDATE
  USING (
    target_id = auth.uid()
    OR current_user_role() IN ('scheduler', 'admin')
  );

-- availability: employees manage own, schedulers see all
CREATE POLICY "avail_select" ON availability FOR SELECT
  USING (
    employee_id = auth.uid()
    OR current_user_role() IN ('scheduler', 'admin')
  );
CREATE POLICY "avail_write" ON availability FOR ALL
  USING (employee_id = auth.uid());

-- push_subscriptions: only own
CREATE POLICY "push_own" ON push_subscriptions FOR ALL
  USING (employee_id = auth.uid());

-- =============================================
-- Trigger: auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

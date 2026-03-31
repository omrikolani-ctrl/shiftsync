import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'employee') redirect('/dashboard')

  const { data: employees } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-muted-foreground">{employees?.length ?? 0} members</p>
      </div>

      <div className="space-y-2">
        {employees?.map(emp => {
          const initials = emp.full_name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)

          return (
            <Card key={emp.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {emp.department ?? 'No department'} · Joined {format(new Date(emp.created_at), 'MMM yyyy')}
                    </p>
                  </div>
                  <Badge
                    variant={emp.role === 'employee' ? 'secondary' : 'default'}
                    className="capitalize shrink-0"
                  >
                    {emp.role}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Zap } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: 'employee' } },
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Account created! You can now sign in.')
        setMode('login')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white"
        style={{ background: 'linear-gradient(135deg, oklch(0.42 0.22 258) 0%, oklch(0.28 0.12 260) 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight">ShiftSync</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-5xl font-extrabold leading-tight">
            Requests,<br />handled fast.
          </h1>
          <p className="text-blue-100/80 text-lg leading-relaxed max-w-sm">
            Submit time off, swap shifts, and get approvals — all without the back-and-forth.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: 'Time Off Requests', desc: 'Vacation, sick, personal' },
              { label: 'Shift Swaps', desc: 'Easy 3-party approval' },
              { label: 'Instant Notifications', desc: 'Know the moment it\'s decided' },
              { label: 'Manager Inbox', desc: 'Approve with one click' },
            ].map(f => (
              <div key={f.label} className="bg-white/10 rounded-2xl p-4 border border-white/10">
                <p className="font-bold text-sm">{f.label}</p>
                <p className="text-blue-200/70 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-200/40 text-sm">© 2026 ShiftSync</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex lg:hidden items-center gap-2 justify-center">
            <div className="bg-blue-600 rounded-xl p-2">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-xl text-blue-700">ShiftSync</span>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              {mode === 'login' ? 'Welcome back 👋' : 'Join ShiftSync'}
            </h2>
            <p className="text-gray-500 mt-1">
              {mode === 'login' ? 'Sign in to your account' : 'Create your account to get started'}
            </p>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold text-gray-700 text-sm disabled:opacity-60"
          >
            {googleLoading ? (
              <span className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-gray-700 font-semibold">Full name</Label>
                <Input id="fullName" placeholder="Jane Smith" value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="h-11 rounded-xl border-gray-200" required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 font-semibold">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11 rounded-xl border-gray-200" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-700 font-semibold">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-11 rounded-xl border-gray-200" required minLength={6} />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
            )}
            {message && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">{message}</p>
            )}

            <Button type="submit" className="w-full h-11 rounded-xl font-bold text-base"
              style={{ background: 'linear-gradient(135deg, oklch(0.52 0.22 255), oklch(0.45 0.2 265))' }}
              disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
              className="text-blue-600 font-bold hover:text-blue-700">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

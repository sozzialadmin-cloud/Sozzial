import React, { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Chrome, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/lib/AuthContext'
import { authModes } from '@/lib/validators/auth'

const EMAIL_STORAGE_KEY = 'sozzial_auth_email'

const initialForm = {
  username: '',
  email: '',
  password: '',
  rememberMe: true,
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function validateForm(values, mode) {
  const errors = {}
  const email = cleanEmail(values.email)
  const password = String(values.password || '')
  const username = String(values.username || '').trim().replace(/^@+/, '')

  if (mode === authModes.SIGN_UP && username.length < 2) errors.username = 'Choose a public username.'
  else if (mode === authModes.SIGN_UP && !/^[a-zA-Z0-9._-]{2,30}$/.test(username)) errors.username = 'Use letters, numbers, dots, hyphens or underscores.'
  if (!email) errors.email = 'Enter your email.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email.'
  if (!password) errors.password = 'Enter your password.'
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters.'
  return errors
}

function friendlyPageError(error) {
  const raw = String(error?.message || error || '').trim()
  const lower = raw.toLowerCase()
  if (!raw) return 'Could not complete the action.'
  if (lower.includes('supabase') || lower.includes('environment') || lower.includes('fetch')) {
    return 'Authentication is not connected yet. Check the private project configuration.'
  }
  if (lower.includes('invalid login credentials')) return 'Email or password is incorrect.'
  if (lower.includes('email not confirmed')) return 'Confirm your email from the message we sent you.'
  if (lower.includes('already') || lower.includes('registered')) return 'An account already exists with that email. Try signing in.'
  return raw
}

function Field({ icon: Icon, error, rightSlot, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b836f]" />
        <Input
          {...props}
          className={`h-12 rounded-2xl border border-black/10 bg-white pl-11 ${rightSlot ? 'pr-12' : 'pr-4'} text-[#111] placeholder:text-[#9b9283] ${className}`}
        />
        {rightSlot ? <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div> : null}
      </div>
      {error ? <p className="px-1 text-xs text-[#b54834]">{error}</p> : null}
    </div>
  )
}

export default function AuthPage() {
  const {
    signIn,
    signUp,
    signInWithProvider,
    resetPassword,
    isAuthenticated,
    isLoadingAuth,
    authError,
    isSupabaseConfigured,
  } = useAuth()

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState(authModes.SIGN_IN)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const nextUrl = searchParams.get('next') || '/home'

  const title = mode === authModes.SIGN_IN ? 'Sign in to your account.' : 'Create your account.'
  const subtitle = mode === authModes.SIGN_IN ? 'Get back to your plans, chats and saved spots.' : 'Your email stays private. Your public username helps people recognize you.'
  const canSubmit = useMemo(() => Boolean(isSupabaseConfigured && !submitting), [isSupabaseConfigured, submitting])

  useEffect(() => {
    const saved = localStorage.getItem(EMAIL_STORAGE_KEY)
    if (saved) setForm((current) => ({ ...current, email: saved }))
  }, [])

  useEffect(() => {
    setErrors({})
    setFormError('')
    setSuccessMessage('')
    setShowPassword(false)
    setForm((current) => ({
      ...current,
      password: '',
      username: mode === authModes.SIGN_UP ? current.username : '',
    }))
  }, [mode])

  if (isLoadingAuth) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4efe6]">
        <Loader2 className="h-8 w-8 animate-spin text-[#111]" />
      </div>
    )
  }

  if (isAuthenticated) return <Navigate to={nextUrl} replace />

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
    setFormError('')
  }

  const persistRememberChoice = () => {
    if (form.rememberMe) localStorage.setItem(EMAIL_STORAGE_KEY, cleanEmail(form.email))
    else localStorage.removeItem(EMAIL_STORAGE_KEY)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm(form, mode)
    setErrors(nextErrors)
    setSuccessMessage('')
    setFormError('')
    if (Object.keys(nextErrors).length) return
    if (!isSupabaseConfigured) {
      setFormError('Authentication is not connected yet. Check the private project configuration.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === authModes.SIGN_IN) {
        await signIn(cleanEmail(form.email), form.password)
        persistRememberChoice()
        toast.success('Welcome back to Sozzial')
        navigate(nextUrl, { replace: true })
        return
      }

      const result = await signUp({
        email: cleanEmail(form.email),
        password: form.password,
        fullName: form.username.trim().replace(/^@+/, ''),
      })
      persistRememberChoice()
      if (result?.session?.user) {
        toast.success('Account created. Welcome to Sozzial')
        navigate(nextUrl, { replace: true })
        return
      }
      setSuccessMessage('Account created. Check your email to confirm it, then sign in.')
      toast.success('Account created. Check your email.')
      setMode(authModes.SIGN_IN)
    } catch (error) {
      const message = friendlyPageError(error)
      setFormError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgotPassword = async () => {
    setSuccessMessage('')
    setFormError('')
    const email = cleanEmail(form.email)
    if (!email) {
      setErrors((current) => ({ ...current, email: 'Write your email first.' }))
      return
    }
    try {
      await resetPassword(email)
      setSuccessMessage('We sent you an email to reset your password.')
      toast.success('Recovery email sent.')
    } catch (error) {
      const message = friendlyPageError(error)
      setFormError(message)
      toast.error(message)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured) {
      setFormError('Authentication is not connected yet. Check the private project configuration.')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      await signInWithProvider('google')
    } catch (error) {
      const message = friendlyPageError(error)
      setFormError(message)
      toast.error(message)
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen min-h-screen bg-[#f4efe6] px-4 py-6 text-[#111]">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden rounded-[30px] bg-[#111111] p-8 text-white shadow-[0_30px_90px_rgba(17,17,17,0.18)] lg:flex lg:flex-col lg:justify-between">
            <div>
              <img src="/mobile-icon.svg" alt="Sozzial" className="mb-4 h-14 w-14 rounded-2xl object-contain" />
              <div className="text-[3rem] font-black leading-[0.92] tracking-tight">Pizza plans, not profile swipes.</div>
              <p className="mt-4 max-w-md text-base leading-7 text-white/70">
                Explore the map as a guest. Sign in only when you want to join plans, create one, rate a spot or chat with the group.
              </p>
            </div>

            <div className="grid gap-3 text-sm">
              {['Public map with slice prices', 'Discover plans with smooth gestures', 'Join groups and coordinate in chat', 'Add spots and improve the map'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/85">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="w-full rounded-[28px] border border-black/10 bg-[#fffaf1] p-5 shadow-[0_28px_70px_rgba(34,25,11,0.12)] md:p-6 lg:p-7">
            <div className="mb-6 flex items-center gap-4 lg:hidden">
              <img src="/logo.svg" alt="Sozzial" className="h-14 w-auto max-w-[190px] object-contain" />
              <div>
                <div className="sr-only">Sozzial</div>
                <div className="mt-1 text-sm text-[#6e6558]">Explore as a guest. Sign in to join plans, chat and create your own.</div>
              </div>
            </div>

            {!isSupabaseConfigured ? (
              <div className="mb-4 rounded-2xl border border-[#efc5bc] bg-[#fff0ea] p-3 text-sm text-[#b54834]">
                Authentication is not connected yet. Configure the private project keys before opening real signups.
              </div>
            ) : null}

            <div className="mb-5 flex rounded-2xl bg-[#eee3d2] p-1">
              <button type="button" onClick={() => setMode(authModes.SIGN_UP)} className={`h-11 flex-1 rounded-xl text-sm font-bold ${mode === authModes.SIGN_UP ? 'bg-white text-[#111] shadow-sm' : 'text-[#857b6b]'}`}>
                Create account
              </button>
              <button type="button" onClick={() => setMode(authModes.SIGN_IN)} className={`h-11 flex-1 rounded-xl text-sm font-bold ${mode === authModes.SIGN_IN ? 'bg-white text-[#111] shadow-sm' : 'text-[#857b6b]'}`}>
                Sign in
              </button>
            </div>

            <div className="mb-5">
              <h1 className="text-[2rem] font-black leading-[0.98] tracking-tight">{title}</h1>
              <p className="mt-2 text-sm text-[#9a9182]">{subtitle}</p>
            </div>

            <Button type="button" variant="outline" disabled={submitting || !isSupabaseConfigured} onClick={handleGoogleSignIn} className="mb-4 h-12 w-full rounded-2xl border-black/10 bg-white text-sm font-semibold text-[#111] hover:bg-[#fbfaf7]">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
              Continue with Google
            </Button>

            <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[#9a9182]">
              <div className="h-px flex-1 bg-black/10" />
              <span>or use email</span>
              <div className="h-px flex-1 bg-black/10" />
            </div>

            <form onSubmit={onSubmit} className="space-y-3" noValidate>
              {mode === authModes.SIGN_UP ? (
                <Field
                  icon={User}
                  placeholder="Public username"
                  autoComplete="nickname"
                  value={form.username}
                  onChange={(event) => updateField('username', event.target.value)}
                  error={errors.username}
                />
              ) : null}

              <Field
                icon={Mail}
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                error={errors.email}
              />

              <Field
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                autoComplete={mode === authModes.SIGN_IN ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                error={errors.password}
                rightSlot={
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="grid h-7 w-7 place-items-center rounded-full text-[#8b836f] hover:bg-[#f1eadf] hover:text-[#111]" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <div className="flex items-center justify-between gap-3 px-1 pt-1 text-xs text-[#8d8577]">
                <label className="inline-flex items-center gap-2">
                  <Checkbox checked={form.rememberMe} onCheckedChange={(value) => updateField('rememberMe', Boolean(value))} />
                  <span>Remember me</span>
                </label>
                <button type="button" onClick={handleForgotPassword} className="font-medium hover:text-[#111]">
                  Forgot password
                </button>
              </div>

              {(formError || (authError?.type !== 'config_missing' && authError?.message)) ? (
                <div className="rounded-2xl border border-[#efc5bc] bg-[#fff0ea] p-3 text-sm text-[#b54834]">{formError || friendlyPageError(authError)}</div>
              ) : null}
              {successMessage ? (
                <div className="rounded-2xl border border-[#d7e6d1] bg-[#eef7ec] p-3 text-sm text-[#216b33]">{successMessage}</div>
              ) : null}

              <Button type="submit" disabled={!canSubmit} className="h-12 w-full rounded-2xl border-0 bg-[#6d6cf7] text-base font-bold text-white hover:bg-[#5f5eee] disabled:opacity-55">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === authModes.SIGN_IN ? 'Sign in' : 'Create account'}
                {!submitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </form>

            <Link to="/home" className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 bg-[#f9f4eb] text-sm font-semibold text-[#111] hover:bg-[#fbfaf7]">
              Continue as guest
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}

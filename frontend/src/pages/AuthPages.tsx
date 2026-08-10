import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('alex@atlas.dev')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <h1>Welcome back</h1>
      <p className="muted">Sign in to your workspace. Demo: alex@atlas.dev / password123</p>
      {error && <div className="alert">{error}</div>}
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
      <button className="btn btn-primary btn-block" disabled={busy} type="submit">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="muted center">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </form>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await register({
        email,
        full_name: fullName,
        password,
        job_title: jobTitle || undefined,
      })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <h1>Create account</h1>
      <p className="muted">Start planning projects in minutes.</p>
      {error && <div className="alert">{error}</div>}
      <label>
        Full name
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Job title
        <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Optional" />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
      <button className="btn btn-primary btn-block" disabled={busy} type="submit">
        {busy ? 'Creating…' : 'Create account'}
      </button>
      <p className="muted center">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </form>
  )
}

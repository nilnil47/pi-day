import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getCompetitionId, isConfigComplete } from '../lib/config'
import { createSupabaseClient } from '../lib/supabase'

export function AdminPage() {
  const ready = isConfigComplete()
  const competitionId = useMemo(() => getCompetitionId()!, [])

  const [secret, setSecret] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function callRpc(name: 'admin_start' | 'admin_reset_round' | 'admin_finish') {
    if (!ready) return
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const supabase = createSupabaseClient()
      const { data, error: rpcErr } = await supabase.rpc(name, {
        competition_uuid: competitionId,
        secret: secret.trim(),
      })
      if (rpcErr) throw rpcErr
      const payload = data as { error?: string; ok?: boolean }
      if (payload?.error === 'unauthorized') {
        setError('סיסמת האדמין לא תואמת.')
        return
      }
      if (payload?.error) {
        setError(payload.error)
        return
      }
      if (name === 'admin_start') setStatus('התחרות החלה. המשתתפים יכולים להקליד ספרות.')
      if (name === 'admin_reset_round')
        setStatus('איפוס סיבוב: כל המשתתפים חזרו ל־0 ספרות ול־0 טעויות, מצב ממתין.')
      if (name === 'admin_finish') setStatus('התחרות סומנה כהסתיימה.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent, action: 'admin_start' | 'admin_reset_round' | 'admin_finish') {
    e.preventDefault()
    void callRpc(action)
  }

  return (
    <div className="stack narrow">
      <header>
        <h1>אדמין</h1>
        <p className="muted">
          הסיסמה היא הערך של <code>admin_secret</code> בשורת התחרות בבסיס הנתונים (ברירת המחדל אחרי הסכמה:{' '}
          <code>pi-day-admin-secret</code>). שנה אותה ב־SQL לפני אירוע אמיתי.
        </p>
      </header>

      {!ready ? (
        <p className="card warn-card">מלאו את קובץ ה־.env לפני השימוש.</p>
      ) : (
        <form className="card form-card" onSubmit={(e) => e.preventDefault()}>
          <label className="field">
            <span>סיסמת אדמין</span>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}
          {status ? <p className="form-success">{status}</p> : null}

          <div className="admin-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={(e) => onSubmit(e, 'admin_start')}
            >
              התחל תחרות
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={(e) => onSubmit(e, 'admin_reset_round')}
            >
              איפוס סיבוב
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={(e) => onSubmit(e, 'admin_finish')}
            >
              סיים תחרות
            </button>
          </div>

          <p className="muted small">
            איפוס מנקה ניקוד, מאפס מונה טעויות (שלוש עד פסילה), ומחזיר את כולם למשחק. "סיים תחרות" נועל הקלדה עד
            איפוס/התחלה מחדש לפי ההגדרות שלכם במסך המשחק.
          </p>
        </form>
      )}

      <Link className="btn btn-ghost" to="/">
        בית
      </Link>
    </div>
  )
}

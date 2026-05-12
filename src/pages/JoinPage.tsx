import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AVATAR_LABELS_HE } from '../avatarLabels'
import { AvatarArt } from '../components/AvatarArt'
import { getCompetitionId, isConfigComplete } from '../lib/config'
import { createSupabaseClient } from '../lib/supabase'

export function JoinPage() {
  const navigate = useNavigate()
  const ready = isConfigComplete()
  const competitionId = useMemo(() => getCompetitionId()!, [])

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      const supabase = createSupabaseClient()
      const { error: anonErr } = await supabase.auth.signInAnonymously()
      if (anonErr) throw anonErr

      const { data, error: rpcErr } = await supabase.rpc('join_competition', {
        competition_uuid: competitionId,
        player_name: name,
        avatar,
      })
      if (rpcErr) throw rpcErr
      const payload = data as { error?: string; ok?: boolean }
      if (payload?.error) {
        setError(payload.error)
        return
      }
      navigate('/play')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack narrow">
      <header>
        <h1>הצטרפות</h1>
        <p className="muted">
          בחרו שם לתצוגה ואווטר בסימן ליום הפאי. אפשר לחזור לעמוד הזה כדי לעדכן שם/אווטר לפני תחילת התחרות.
        </p>
      </header>

      {!ready ? (
        <p className="card warn-card">מלאו את קובץ ה־.env לפני הצטרפות.</p>
      ) : (
        <form className="card form-card" onSubmit={onSubmit}>
          <label className="field">
            <span>שם בתחרות</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={48}
              required
              placeholder="לדוגמה: נועם"
              autoComplete="nickname"
            />
          </label>

          <fieldset className="field">
            <legend>אווטר (10 סוגים)</legend>
            <div className="avatar-grid">
              {AVATAR_LABELS_HE.map((label, id) => (
                <button
                  key={id}
                  type="button"
                  className={'avatar-tile' + (avatar === id ? ' avatar-tile--active' : '')}
                  onClick={() => setAvatar(id)}
                >
                  <AvatarArt id={id} size={56} />
                  <span className="avatar-tile__label">{label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="cta-row">
            <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
              {busy ? 'נרשמים…' : 'שמירה ומעבר למשחק'}
            </button>
            <Link className="btn btn-ghost" to="/">
              בית
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}

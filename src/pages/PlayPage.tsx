import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaderboard } from '../components/Leaderboard'
import { AvatarArt } from '../components/AvatarArt'
import type { CompetitionStatus, ParticipantRow } from '../types'
import { getCompetitionId, isConfigComplete } from '../lib/config'
import { createSupabaseClient } from '../lib/supabase'

export function PlayPage() {
  const ready = isConfigComplete()
  const competitionId = useMemo(() => getCompetitionId()!, [])

  const [status, setStatus] = useState<CompetitionStatus>('waiting')
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [self, setSelf] = useState<ParticipantRow | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState(false)

  const refreshSelf = useCallback(async () => {
    if (!ready) return
    const supabase = createSupabaseClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const uid = sessionData.session?.user.id ?? null
    setUserId(uid)
    if (!uid) {
      setSelf(null)
      return
    }
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('user_id', uid)
      .maybeSingle()
    if (error) {
      setMessage(error.message)
      return
    }
    setSelf((data as ParticipantRow | null) ?? null)
  }, [competitionId, ready])

  const refreshAll = useCallback(async () => {
    if (!ready) return
    const supabase = createSupabaseClient()
    const { data: comp, error: cErr } = await supabase
      .from('competitions')
      .select('status')
      .eq('id', competitionId)
      .maybeSingle()
    if (cErr) {
      setMessage(cErr.message)
      return
    }
    if (comp?.status) setStatus(comp.status as CompetitionStatus)

    const { data: rows, error: pErr } = await supabase
      .from('participants')
      .select('*')
      .eq('competition_id', competitionId)
      .order('digits_correct', { ascending: false })
    if (pErr) {
      setMessage(pErr.message)
      return
    }
    setParticipants((rows as ParticipantRow[]) ?? [])
  }, [competitionId, ready])

  useEffect(() => {
    queueMicrotask(() => {
      void Promise.all([refreshAll(), refreshSelf()])
    })
  }, [refreshAll, refreshSelf])

  useEffect(() => {
    if (!ready) return
    const supabase = createSupabaseClient()

    const participantChannel = supabase
      .channel(`participants:${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `competition_id=eq.${competitionId}`,
        },
        () => {
          void refreshAll()
          void refreshSelf()
        },
      )
      .subscribe()

    const competitionChannel = supabase
      .channel(`competition:${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'competitions',
          filter: `id=eq.${competitionId}`,
        },
        () => {
          void refreshAll()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(participantChannel)
      void supabase.removeChannel(competitionChannel)
    }
  }, [competitionId, ready, refreshAll, refreshSelf])

  useEffect(() => {
    if (!ready) return
    const supabase = createSupabaseClient()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refreshSelf()
    })
    return () => sub.subscription.unsubscribe()
  }, [ready, refreshSelf])

  const onKey = useCallback(
    async (digit: string) => {
      if (!ready || !userId) {
        setMessage('כדאי להירשם בדף ההצטרפות לפני המשחק.')
        return
      }
      if (!self) {
        setMessage('לא נמצא רישום למשתמש הזה. חזרו ל"הצטרפות".')
        return
      }
      if (status !== 'active') return
      if (self.eliminated) return
      if (busyKey) return

      setBusyKey(true)
      setMessage(null)
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase.rpc('submit_digit', {
          competition_uuid: competitionId,
          digit,
        })
        if (error) throw error
        const p = data as {
          error?: string
          ok?: boolean
          correct?: boolean
          eliminated?: boolean
          digits?: number
        }
        if (p.error === 'eliminated') {
          setMessage('כבר נפסלת בתחרות הזאת.')
        } else if (p.error === 'not_active') {
          setMessage('התחרות עדיין לא התחילה.')
        } else if (p.error) {
          setMessage(p.error)
        } else if (p.eliminated) {
          setMessage('אופס! הספרה לא נכונה — נפסלת מהתחרות.')
        }
        await refreshAll()
        await refreshSelf()
      } catch (err: unknown) {
        setMessage(err instanceof Error ? err.message : 'שגיאה בשליחת ספרה')
      } finally {
        setBusyKey(false)
      }
    },
    [busyKey, competitionId, ready, refreshAll, refreshSelf, self, status, userId],
  )

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (status !== 'active') return
      if (!self || self.eliminated) return
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return
      if (!/^[0-9]$/.test(ev.key)) return
      ev.preventDefault()
      void onKey(ev.key)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onKey, self, status])

  const keypadDigits = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0']

  if (!ready) {
    return (
      <div className="stack narrow">
        <p className="card warn-card">מלאו את קובץ ה־.env לפני המשחק.</p>
        <Link className="btn" to="/">
          חזרה
        </Link>
      </div>
    )
  }

  return (
    <div className="play-layout">
      <section className="play-main card">
        <header className="play-head">
          <div>
            <h1>תחרות π</h1>
            <p className="muted">
              מצב:{' '}
              <strong>
                {status === 'waiting' && 'מחכים לאדמין'}
                {status === 'active' && 'במהלך'}
                {status === 'finished' && 'הסתיימה'}
              </strong>
            </p>
          </div>
          <div className="cta-row">
            <Link className="btn btn-ghost" to="/join">
              עריכת שם / אווטר
            </Link>
            <Link className="btn btn-ghost" to="/">
              בית
            </Link>
          </div>
        </header>

        {!userId || !self ? (
          <div className="notice">
            <p>עדיין לא נרשמתם.</p>
            <Link className="btn btn-primary" to="/join">
              להצטרפות
            </Link>
          </div>
        ) : (
          <div className="player-panel">
            <div className="player-panel__identity">
              <AvatarArt id={self.avatar_type} size={64} />
              <div>
                <div className="player-name">{self.display_name}</div>
                <div className="muted">ספרות נכונות: {self.digits_correct}</div>
              </div>
            </div>

            {status !== 'active' ? (
              <p className="notice-inline">
                {status === 'waiting'
                  ? 'כשהאדמין יתחיל את התחרות — תוכלו להקליד ספרות או להשתמש בלוח המקשים.'
                  : 'התחרות הסתיימה. אפשר לראות את התוצאות בלוח המובילים.'}
              </p>
            ) : self.eliminated ? (
              <div className="notice notice--bad">
                נפסלתם מהתחרות אבל עדיין מופיעים בלוח עם מספר הספרות שזכרתם.
              </div>
            ) : (
              <>
                <p className="hint">הקלידו ספרות 0–9 במקלדת או בלוח למטה. הספרה הראשונה היא 3, אחר כך 1, ואז 4…</p>
                <div className="digit-display" aria-live="polite">
                  {self.digits_correct}
                </div>
                <p className="digit-caption">ספרות רצופות נכונות (מתחילות ב־3 של π)</p>
                <div className="keypad" dir="ltr">
                  {keypadDigits.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className="key"
                      disabled={busyKey}
                      onClick={() => void onKey(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {message ? <p className="form-error">{message}</p> : null}
      </section>

      <aside className="play-side card">
        <h2>לוח מובילים</h2>
        <p className="muted small">
          המיון לפי מספר ספרות נכון. במקרה של שוויון — מי שעדיין במשחק מדורג למעלה.
        </p>
        <Leaderboard rows={participants} selfUserId={userId} />
      </aside>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaderboard, rankSortParticipants } from '../components/Leaderboard'
import { AvatarArt } from '../components/AvatarArt'
import type { CompetitionStatus, ParticipantRow } from '../types'
import { getCompetitionId, isConfigComplete } from '../lib/config'
import { createSupabaseClient } from '../lib/supabase'
import { PI_DIGITS } from '../data/piDigits'

const MAX_WRONG_ATTEMPTS = 3

/** מזהה יציב למצב בדיקה מקומית — תואם פורמט UUID */
const TEST_LOCAL_USER_ID = '00000000-0000-4000-8000-0000000000aa'

function createTestSelf(): ParticipantRow {
  const now = new Date().toISOString()
  return {
    id: '00000000-0000-4000-8000-0000000000bb',
    competition_id: '00000000-0000-4000-8000-0000000000cc',
    user_id: TEST_LOCAL_USER_ID,
    display_name: 'בדיקה מקומית',
    avatar_type: 3,
    digits_correct: 0,
    wrong_attempts: 0,
    eliminated: false,
    joined_at: now,
    last_input_at: null,
  }
}

/** אותה לוגיקה כמו submit_digit בשרת — מול PI_DIGITS בלבד. */
function localEvaluateDigit(self: ParticipantRow, digit: string): SubmitDigitPayload {
  if (digit.length !== 1 || !/^[0-9]$/.test(digit)) {
    return { error: 'invalid_digit' }
  }
  if (self.eliminated) {
    return { error: 'eliminated', digits: self.digits_correct }
  }
  if (self.digits_correct >= PI_DIGITS.length) {
    return { error: 'pi_data' }
  }
  const expected = PI_DIGITS[self.digits_correct]!
  if (digit === expected) {
    return { ok: true, correct: true, digits: self.digits_correct + 1 }
  }
  const newWrong = (self.wrong_attempts ?? 0) + 1
  if (newWrong >= MAX_WRONG_ATTEMPTS) {
    return {
      ok: true,
      correct: false,
      eliminated: true,
      wrong_attempts: newWrong,
      digits: self.digits_correct,
    }
  }
  return {
    ok: true,
    correct: false,
    eliminated: false,
    wrong_attempts: newWrong,
    digits: self.digits_correct,
  }
}

type SubmitDigitPayload = {
  error?: string
  ok?: boolean
  correct?: boolean
  eliminated?: boolean
  digits?: number
  wrong_attempts?: number
}

function patchRowsFromSubmitDigit(userId: string, p: SubmitDigitPayload, rows: ParticipantRow[]): ParticipantRow[] {
  if (p.error) return rows
  return [...rows]
    .map((row) =>
      row.user_id === userId
        ? {
            ...row,
            digits_correct: typeof p.digits === 'number' ? p.digits : row.digits_correct,
            wrong_attempts: typeof p.wrong_attempts === 'number' ? p.wrong_attempts : row.wrong_attempts,
            eliminated: p.eliminated === true ? true : row.eliminated,
          }
        : row,
    )
    .sort(rankSortParticipants)
}

function patchSelfFromSubmitDigit(prev: ParticipantRow | null, p: SubmitDigitPayload): ParticipantRow | null {
  if (!prev || p.error) return prev
  return {
    ...prev,
    digits_correct: typeof p.digits === 'number' ? p.digits : prev.digits_correct,
    wrong_attempts: typeof p.wrong_attempts === 'number' ? p.wrong_attempts : prev.wrong_attempts,
    eliminated: p.eliminated === true ? true : prev.eliminated,
  }
}

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  if (t.isContentEditable) return true
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/** ספרות לפי מיקום פיזי במקלדת (עובד גם כשהשפה בעברית) או לפי ev.key כגיבוי. */
function digitFromKeyboard(ev: KeyboardEvent): string | null {
  const fromCode = /^Digit([0-9])$/.exec(ev.code) ?? /^Numpad([0-9])$/.exec(ev.code)
  if (fromCode) return fromCode[1]
  if (/^[0-9]$/.test(ev.key)) return ev.key
  return null
}

export function PlayPage({ testMode = false }: { testMode?: boolean }) {
  const ready = testMode || isConfigComplete()
  const competitionId = useMemo(
    () => (testMode ? '00000000-0000-4000-8000-0000000000cc' : getCompetitionId()!),
    [testMode],
  )

  const [status, setStatus] = useState<CompetitionStatus>('waiting')
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [self, setSelf] = useState<ParticipantRow | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState(false)

  const refreshSelf = useCallback(async () => {
    if (testMode) return
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
  }, [competitionId, ready, testMode])

  const refreshAll = useCallback(async () => {
    if (testMode) return
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
  }, [competitionId, ready, testMode])

  useEffect(() => {
    if (testMode) return
    queueMicrotask(() => {
      void Promise.all([refreshAll(), refreshSelf()])
    })
  }, [refreshAll, refreshSelf, testMode])

  useEffect(() => {
    if (!ready || testMode) return
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
  }, [competitionId, ready, refreshAll, refreshSelf, testMode])

  useEffect(() => {
    if (testMode) return
    if (!ready) return
    const supabase = createSupabaseClient()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refreshSelf()
    })
    return () => sub.subscription.unsubscribe()
  }, [ready, refreshSelf, testMode])

  useEffect(() => {
    if (!testMode) return
    const s = createTestSelf()
    setSelf(s)
    setParticipants([s])
    setUserId(TEST_LOCAL_USER_ID)
    setStatus('active')
    setMessage(null)
  }, [testMode])

  const resetTestGame = useCallback(() => {
    const s = createTestSelf()
    setSelf(s)
    setParticipants([s])
    setMessage(null)
  }, [])

  const onKey = useCallback(
    async (digit: string) => {
      if (testMode) {
        if (!userId || !self) return
        if (status !== 'active') return
        if (self.eliminated) return
        if (busyKey) return
        setBusyKey(true)
        setMessage(null)
        try {
          const p = localEvaluateDigit(self, digit)
          if (p.error === 'eliminated') {
            setMessage('כבר נפסלת (מצב בדיקה).')
          } else if (p.error === 'pi_data') {
            setMessage(`הגעתם לסוף הספרות המקומיות (${PI_DIGITS.length}).`)
          } else if (p.error) {
            setMessage(p.error)
          } else if (p.eliminated) {
            setMessage(`אופס! הספרה לא נכונה — נפסלת אחרי ${MAX_WRONG_ATTEMPTS} טעויות (מצב בדיקה).`)
          } else if (p.correct === false && typeof p.wrong_attempts === 'number') {
            const left = MAX_WRONG_ATTEMPTS - p.wrong_attempts
            if (left === 1) {
              setMessage('אופס! הספרה לא נכונה. נותר לך ניסיון אחד לפני פסילה.')
            } else {
              setMessage(`אופס! הספרה לא נכונה. נותרו ${left} ניסיונות עד פסילה.`)
            }
          }
          if (!p.error) {
            setSelf((prev) => patchSelfFromSubmitDigit(prev, p))
            setParticipants((rows) => patchRowsFromSubmitDigit(TEST_LOCAL_USER_ID, p, rows))
          }
        } finally {
          setBusyKey(false)
        }
        return
      }

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
        const p = data as SubmitDigitPayload
        if (p.error === 'eliminated') {
          setMessage('כבר נפסלת בתחרות הזאת.')
        } else if (p.error === 'not_active') {
          setMessage('התחרות עדיין לא התחילה.')
        } else if (p.error === 'pi_data') {
          setMessage('שגיאת נתוני π בשרת.')
        } else if (p.error) {
          setMessage(p.error)
        } else if (p.eliminated) {
          setMessage(`אופס! הספרה לא נכונה — נפסלת מהתחרות אחרי ${MAX_WRONG_ATTEMPTS} טעויות.`)
        } else if (p.correct === false && typeof p.wrong_attempts === 'number') {
          const left = MAX_WRONG_ATTEMPTS - p.wrong_attempts
          if (left === 1) {
            setMessage('אופס! הספרה לא נכונה. נותר לך ניסיון אחד לפני פסילה.')
          } else {
            setMessage(`אופס! הספרה לא נכונה. נותרו ${left} ניסיונות עד פסילה.`)
          }
        }
        // עדכון מקומי מתשובת ה־RPC — בלי לקרוא שוב את כל הטבלאות; Realtime יסנכרן שינויים ממשתמשים אחרים.
        if (!p.error) {
          setSelf((prev) => patchSelfFromSubmitDigit(prev, p))
          setParticipants((rows) => patchRowsFromSubmitDigit(userId, p, rows))
        }
      } catch (err: unknown) {
        setMessage(err instanceof Error ? err.message : 'שגיאה בשליחת ספרה')
      } finally {
        setBusyKey(false)
      }
    },
    [busyKey, competitionId, ready, self, status, testMode, userId],
  )

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (status !== 'active') return
      if (!self || self.eliminated) return
      if (ev.repeat) return
      if (isEditableTarget(ev.target)) return
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return
      const digit = digitFromKeyboard(ev)
      if (!digit) return
      ev.preventDefault()
      void onKey(digit)
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
    <div className="play-page">
      <div className="play-layout">
        <section className="play-main card">
          <header className="play-head">
            <div>
              <h1>{testMode ? 'תחרות π — מצב בדיקה' : 'תחרות π'}</h1>
              <p className="muted">
                {testMode ? (
                  <>
                    מצב: <strong>מקומי (ללא רשת)</strong> — אותם כללי משחק, בלי Supabase.
                  </>
                ) : (
                  <>
                    מצב:{' '}
                    <strong>
                      {status === 'waiting' && 'מחכים לאדמין'}
                      {status === 'active' && 'במהלך'}
                      {status === 'finished' && 'הסתיימה'}
                    </strong>
                  </>
                )}
              </p>
            </div>
            <div className="cta-row">
              {testMode ? (
                <>
                  <button type="button" className="btn btn-primary" onClick={resetTestGame}>
                    איפוס משחק
                  </button>
                  <Link className="btn btn-ghost" to="/play">
                    למסך תחרות אמיתי
                  </Link>
                  <Link className="btn btn-ghost" to="/">
                    בית
                  </Link>
                </>
              ) : (
                <>
                  <Link className="btn btn-ghost" to="/join">
                    עריכת שם / אווטר
                  </Link>
                  <Link className="btn btn-ghost" to="/">
                    בית
                  </Link>
                </>
              )}
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
                  <div className="muted">
                    טעויות מצטברות: {self.wrong_attempts ?? 0}/{MAX_WRONG_ATTEMPTS}
                  </div>
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
                <div
                  className="play-active"
                  role="application"
                  aria-label="הקלדת ספרות למשחק π — מקשי 0 עד 9 או לוח מספרים"
                >
                  <p className="kbd-legend" aria-hidden="true">
                    <span className="kbd-legend__label">מקלדת</span>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((k) => (
                      <kbd key={k} className="kbd-pill">
                        {k}
                      </kbd>
                    ))}
                  </p>
                  <div className="play-game">
                    <div className="play-game__score">
                      <div
                        className="digit-display"
                        dir="ltr"
                        aria-live="polite"
                        aria-label={
                          self.digits_correct === 0
                            ? 'עדיין אין ספרות נכונות'
                            : `${self.digits_correct} ספרות נכונות ברצף`
                        }
                      >
                        {PI_DIGITS.slice(0, self.digits_correct)}
                      </div>
                      <p className="digit-caption">מה שכבר ניחשתם נכון (תחילת π)</p>
                    </div>
                    <div className="play-game__keys">
                      <p className="keypad-label muted small">או לוח מספרים</p>
                      <div className="keypad" dir="ltr">
                        {keypadDigits.map((d) => (
                          <button
                            key={d}
                            type="button"
                            className={
                              self.digits_correct === 0 && d === '3' ? 'key key--first-pi-digit' : 'key'
                            }
                            disabled={busyKey}
                            onClick={() => void onKey(d)}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {message ? <p className="form-error">{message}</p> : null}
        </section>

        <aside className="play-side card">
          <h2>לוח מובילים</h2>
          <p className="muted small">
            {testMode
              ? 'מצב בדיקה: הרשימה מקומית בלבד (שחקן אחד), בלי Supabase.'
              : 'המיון לפי מספר ספרות נכון. במקרה של שוויון — מי שעדיין במשחק מדורג למעלה.'}
          </p>
          <Leaderboard rows={participants} selfUserId={userId} />
        </aside>
      </div>
    </div>
  )
}

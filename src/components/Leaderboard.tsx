import type { ParticipantRow } from '../types'
import { AvatarArt } from './AvatarArt'

type Props = {
  rows: ParticipantRow[]
  selfUserId: string | null
}

function rankSort(a: ParticipantRow, b: ParticipantRow): number {
  if (b.digits_correct !== a.digits_correct) return b.digits_correct - a.digits_correct
  if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1
  return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
}

export function Leaderboard({ rows, selfUserId }: Props) {
  const sorted = [...rows].sort(rankSort)

  return (
    <div className="leaderboard">
      <div className="leaderboard__head">
        <span>#</span>
        <span>שחקן</span>
        <span>ספרות</span>
        <span>סטטוס</span>
      </div>
      <ul className="leaderboard__list">
        {sorted.map((p, idx) => {
          const place = idx + 1
          const isSelf = selfUserId && p.user_id === selfUserId
          return (
            <li
              key={p.id}
              className={
                'leaderboard__row' +
                (isSelf ? ' leaderboard__row--self' : '') +
                (p.eliminated ? ' leaderboard__row--out' : '')
              }
            >
              <span className="leaderboard__place">{place}</span>
              <span className="leaderboard__who">
                <span className="leaderboard__avatar">
                  <AvatarArt id={p.avatar_type} size={36} />
                </span>
                <span className="leaderboard__name">{p.display_name}</span>
              </span>
              <span className="leaderboard__digits">{p.digits_correct}</span>
              <span className="leaderboard__status">
                {p.eliminated ? 'נפסל' : 'במשחק'}
              </span>
            </li>
          )
        })}
      </ul>
      {sorted.length === 0 ? <p className="muted">אין עדיין משתתפים.</p> : null}
    </div>
  )
}

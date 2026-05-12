import { Link } from 'react-router-dom'
import { isConfigComplete } from '../lib/config'

export function HomePage() {
  const ok = isConfigComplete()

  return (
    <div className="stack">
      <header className="hero-block">
        <p className="eyebrow">יום הפאי · תחרות זיכרון</p>
        <h1>כמה ספרות של π אתם זוכרים?</h1>
        <p className="lede">
          הצטרפו עם שם ובחרו אווטר, המתינו לאדמין, ואז הקלידו ספרה אחר ספרה. טעות אחת — ואתם מחוץ לתחרות. לוח
          המובילים מתעדכן בזמן אמת.
        </p>
      </header>

      {!ok ? (
        <section className="card warn-card">
          <h2>חסרות הגדרות סביבה</h2>
          <p>
            העתיקו את קובץ <code>.env.example</code> ל־<code>.env</code>, מלאו את פרטי Supabase ואת מזהה התחרות
            (<code>VITE_COMPETITION_ID</code>), והריצו שוב.
          </p>
          <p className="muted">
            ב־Supabase: הריצו את <code>supabase/schema.sql</code> בעורך ה־SQL, הפעילו התחברות אנונימית, והפעילו
            replication לטבלה <code>participants</code> עבור Realtime.
          </p>
        </section>
      ) : null}

      <nav className="cta-row">
        <Link className="btn btn-primary" to="/join">
          הצטרפות לתחרות
        </Link>
        <Link className="btn" to="/play">
          מסך משחק + לוח תוצאות
        </Link>
        <Link className="btn btn-ghost" to="/admin">
          פאנל אדמין
        </Link>
      </nav>
    </div>
  )
}

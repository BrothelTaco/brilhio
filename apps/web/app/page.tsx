import Link from "next/link";
import { authHighlights, onboardingPreview } from "./ui/scaffold-data";

export default function AuthEntryPage() {
  return (
    <main className="auth-page">
      <section className="ritmio-shell auth-grid">
        <div className="auth-story">
          <span className="ritmio-pill">Desktop web alpha</span>
          <h1>Plan the full social week before you worry about the app shell.</h1>
          <p>
            Ritmio&apos;s first priority is a strong desktop control room where
            teams can upload media, see the whole week, link channels, and
            decide where AI should guide the schedule.
          </p>

          <div className="auth-highlight-grid">
            {authHighlights.map((highlight) => (
              <article key={highlight.value} className="auth-highlight-card">
                <strong>{highlight.value}</strong>
                <p>{highlight.label}</p>
              </article>
            ))}
          </div>

          <div className="auth-preview-card">
            <div className="preview-head">
              <span className="ritmio-eyebrow">First-time setup preview</span>
              <strong>What onboarding should establish before the dashboard</strong>
            </div>
            <div className="preview-list">
              {onboardingPreview.map((item) => (
                <div key={item.title} className="preview-row">
                  <span>{item.title}</span>
                  <strong>{item.body}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <section className="ritmio-card auth-form-card">
            <div className="form-head">
              <p className="ritmio-eyebrow">Sign in</p>
              <h2>Return to the workspace</h2>
              <p>Static scaffold for the desktop product flow.</p>
            </div>

            <label className="field-stack">
              <span>Work email</span>
              <input type="email" placeholder="operator@company.com" />
            </label>

            <label className="field-stack">
              <span>Password</span>
              <input type="password" placeholder="Password" />
            </label>

            <div className="inline-actions">
              <Link href="/dashboard" className="ritmio-button ritmio-button-primary">
                Enter dashboard
              </Link>
              <a href="#create-account" className="ritmio-button ritmio-button-secondary">
                Need an account?
              </a>
            </div>
          </section>

          <section id="create-account" className="ritmio-card auth-form-card auth-form-muted">
            <div className="form-head">
              <p className="ritmio-eyebrow">Create account</p>
              <h2>Start a new workspace</h2>
              <p>
                Set up the desktop planning environment first, then layer in
                automation and native mobile later.
              </p>
            </div>

            <div className="split-fields">
              <label className="field-stack">
                <span>Name</span>
                <input type="text" placeholder="Josh Kinsley" />
              </label>
              <label className="field-stack">
                <span>Team</span>
                <input type="text" placeholder="Ritmio Studio" />
              </label>
            </div>

            <label className="field-stack">
              <span>Email</span>
              <input type="email" placeholder="founder@company.com" />
            </label>

            <label className="field-stack">
              <span>What do you want first?</span>
              <select defaultValue="calendar">
                <option value="calendar">Weekly calendar planning</option>
                <option value="accounts">Account linking</option>
                <option value="media">Media intake and AI guidance</option>
              </select>
            </label>

            <div className="inline-actions">
              <Link href="/onboarding" className="ritmio-button ritmio-button-primary">
                Continue to onboarding
              </Link>
              <Link href="/account" className="ritmio-button ritmio-button-secondary">
                Preview account profile
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { ProductShell } from "../ui/product-shell";
import {
  audienceSignals,
  connectedPlatforms,
  overviewCards,
  recommendationCards,
  scheduleDays,
  scheduledPosts,
  scheduleTimes,
  uploadChecklist,
} from "../ui/scaffold-data";

function findScheduledPost(day: string, time: string) {
  return scheduledPosts.find((post) => post.day === day && post.time === time);
}

export default function DashboardPage() {
  return (
    <ProductShell
      activePath="/dashboard"
      eyebrow="Home dashboard"
      title="Weekly publishing board"
      description="A desktop-first control room for assigning posts into time slots, monitoring connected apps, and staging media for AI timing analysis."
      actions={
        <>
          <Link href="/account" className="ritmio-button ritmio-button-secondary">
            Review account profile
          </Link>
          <a href="#media-intake" className="ritmio-button ritmio-button-secondary">
            Review media intake
          </a>
          <Link href="/accounts" className="ritmio-button ritmio-button-primary">
            Open account linking
          </Link>
        </>
      }
    >
      <section className="overview-grid">
        {overviewCards.map((card) => (
          <article key={card.label} className="ritmio-card overview-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
          </article>
        ))}
      </section>

      <div className="dashboard-layout">
        <section className="ritmio-card surface-card calendar-surface">
          <div className="surface-head">
            <div>
              <p className="ritmio-eyebrow">Weekly calendar</p>
              <h2>Assign posts into open windows</h2>
            </div>
            <span className="surface-note">
              Drag-and-drop later, layout and hierarchy first
            </span>
          </div>

          <div className="calendar-board">
            <div className="calendar-grid">
              <div className="calendar-corner">MT</div>
              {scheduleDays.map((day) => (
                <div key={day} className="calendar-head-cell">
                  <strong>{day}</strong>
                  <span>Open lane</span>
                </div>
              ))}

              {scheduleTimes.map((time) => (
                <div key={time} className="calendar-row">
                  <div className="calendar-time-cell">
                    <strong>{time}</strong>
                    <span>slot</span>
                  </div>

                  {scheduleDays.map((day) => {
                    const post = findScheduledPost(day, time);

                    return (
                      <div key={`${day}-${time}`} className="calendar-slot">
                        {post ? (
                          <article className="slot-post">
                            <span className={`state-badge ${post.toneClass}`}>
                              {post.platform}
                            </span>
                            <h3>{post.title}</h3>
                            <p>{post.caption}</p>
                          </article>
                        ) : (
                          <div className="slot-empty">
                            <span>Add draft</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="rail-layout">
          <section className="ritmio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="ritmio-eyebrow">Connected apps</p>
                <h2>Channel health</h2>
              </div>
            </div>

            <div className="stack-list">
              {connectedPlatforms.map((platform) => (
                <article key={platform.name} className="list-row">
                  <div>
                    <strong>{platform.name}</strong>
                    <p>{platform.handle}</p>
                  </div>
                  <span className={`state-badge ${platform.toneClass}`}>
                    {platform.health}
                  </span>
                </article>
              ))}
            </div>
          </section>

          <section id="media-intake" className="ritmio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="ritmio-eyebrow">Media submission</p>
                <h2>AI analysis intake</h2>
              </div>
            </div>

            <div className="upload-dropzone">
              <strong>Drop media here</strong>
              <p>
                Images, videos, and carousels will eventually flow through AI
                timing analysis and platform-fit recommendations.
              </p>
            </div>

            <div className="stack-list">
              {uploadChecklist.map((item) => (
                <article key={item} className="bullet-row">
                  <span className="bullet-dot" />
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="ritmio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="ritmio-eyebrow">Strategy context</p>
                <h2>What recommendations should remember</h2>
              </div>
            </div>

            <div className="stack-list">
              {audienceSignals.map((signal) => (
                <article key={signal.title} className="insight-card">
                  <strong>{signal.title}</strong>
                  <p>{signal.value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="ritmio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="ritmio-eyebrow">AI timing suggestions</p>
                <h2>Recommended publish windows</h2>
              </div>
            </div>

            <div className="stack-list">
              {recommendationCards.map((item) => (
                <article key={item.title} className="insight-card">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </ProductShell>
  );
}

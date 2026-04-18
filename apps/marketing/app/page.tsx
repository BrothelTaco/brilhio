const proofStats = [
  {
    value: "1 weekly board",
    label: "Plan every channel from a single desktop calendar.",
  },
  {
    value: "4 core providers",
    label: "Instagram, TikTok, Facebook, and X in one workflow.",
  },
  {
    value: "AI timing lane",
    label: "Upload media and let the system recommend where it belongs.",
  },
] as const;

const workflowSteps = [
  {
    title: "Collect the week",
    body: "Bring draft media, campaign notes, and approval priorities into one planning surface instead of scattering them across chats and folders.",
  },
  {
    title: "Shape the schedule",
    body: "Place posts into real time slots, see connected channels at a glance, and let AI suggest stronger publish windows before anything goes live.",
  },
  {
    title: "Link and launch",
    body: "Review provider readiness in a dedicated account control center before the automation layer ever touches real channels.",
  },
] as const;

const productLanes = [
  {
    title: "Weekly scheduler",
    body: "A desktop-first calendar where every slot can carry content, approvals, and channel context.",
  },
  {
    title: "Media intake",
    body: "A focused submission lane for assets that need AI timing analysis and platform-fit recommendations.",
  },
  {
    title: "Account linking",
    body: "A separate control page for permissions, token health, content rules, and publish guardrails.",
  },
] as const;

const audiences = [
  "Agencies juggling multiple social clients",
  "Founders running launch content themselves",
  "In-house teams managing approvals and timing",
  "Operators who need a desktop command center first",
] as const;

export default function MarketingHome() {
  return (
    <main className="marketing-page">
      <header className="ritmio-shell marketing-topbar">
        <a href="#" className="marketing-brand">
          Ritmio
        </a>
        <nav className="marketing-nav" aria-label="Marketing navigation">
          <a href="#workflow">Workflow</a>
          <a href="#product">Product</a>
          <a href="#audience">Who it is for</a>
        </nav>
        <div className="marketing-actions">
          <button className="ritmio-button ritmio-button-secondary" type="button">
            Request access
          </button>
          <button className="ritmio-button ritmio-button-primary" type="button">
            View desktop scaffold
          </button>
        </div>
      </header>

      <section className="ritmio-shell marketing-hero">
        <div className="hero-panel">
          <span className="ritmio-pill">Desktop-first AI social operations</span>
          <h1>Turn content chaos into a weekly publishing control room.</h1>
          <p>
            Ritmio is built for teams that want one desktop workspace for
            planning, media intake, connected accounts, and AI-guided timing
            before they split energy into mobile polish.
          </p>

          <div className="hero-actions">
            <button className="ritmio-button ritmio-button-primary" type="button">
              Join the alpha
            </button>
            <button className="ritmio-button ritmio-button-secondary" type="button">
              See the planner
            </button>
          </div>

          <div className="proof-grid">
            {proofStats.map((item) => (
              <article key={item.value} className="proof-card">
                <strong>{item.value}</strong>
                <p>{item.label}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="hero-preview ritmio-card">
          <div className="preview-window">
            <div className="window-bar">
              <span />
              <span />
              <span />
            </div>

            <div className="preview-board">
              <div className="preview-column">
                <p className="ritmio-eyebrow">Weekly board</p>
                <article className="preview-module preview-module-primary">
                  <strong>Tue / 10:30 AM</strong>
                  <p>Founder workflow reel queued for Instagram.</p>
                </article>
                <article className="preview-module">
                  <strong>Thu / 2:45 PM</strong>
                  <p>TikTok demo cut recommended for late afternoon.</p>
                </article>
              </div>

              <div className="preview-column">
                <p className="ritmio-eyebrow">AI lane</p>
                <article className="preview-module preview-module-accent">
                  <strong>Media intake</strong>
                  <p>Upload assets for timing analysis and platform fit.</p>
                </article>
                <article className="preview-module">
                  <strong>Provider health</strong>
                  <p>Instagram, TikTok, Facebook, and X all visible at once.</p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="ritmio-shell workflow-grid">
        {workflowSteps.map((step, index) => (
          <article key={step.title} className="ritmio-card workflow-card">
            <span className="workflow-index">0{index + 1}</span>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </article>
        ))}
      </section>

      <section id="product" className="ritmio-shell product-story">
        <div className="story-copy ritmio-card">
          <p className="ritmio-eyebrow">Product structure</p>
          <h2>Built around the screens that matter most at the start.</h2>
          <p>
            The first wave is deliberately simple: a marketing site, a login and
            signup entry, a desktop dashboard, and a dedicated account-linking
            page. That keeps the strongest product loop visible before deeper
            automation and native adaptation arrive.
          </p>
        </div>

        <div className="story-lanes">
          {productLanes.map((lane) => (
            <article key={lane.title} className="ritmio-card story-card">
              <p className="ritmio-eyebrow">Lane</p>
              <h3>{lane.title}</h3>
              <p>{lane.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="audience" className="ritmio-shell audience-section ritmio-card">
        <div>
          <p className="ritmio-eyebrow">Who this is for</p>
          <h2>Teams that need structure before scale.</h2>
        </div>
        <div className="audience-grid">
          {audiences.map((audience) => (
            <article key={audience} className="audience-card">
              <strong>{audience}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="ritmio-shell final-cta">
        <div className="cta-panel">
          <p className="ritmio-eyebrow">Next up</p>
          <h2>Dial in the desktop experience, then translate the best parts to mobile.</h2>
          <p>
            The desktop planner should feel complete first. Once the weekly
            workflow is strong, the mobile app can become a focused companion
            instead of a compromised primary surface.
          </p>
          <div className="hero-actions">
            <button className="ritmio-button ritmio-button-primary" type="button">
              Start with web
            </button>
            <button className="ritmio-button ritmio-button-secondary" type="button">
              Review product pages
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

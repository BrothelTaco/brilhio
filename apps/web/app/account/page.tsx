import Link from "next/link";
import { ProductShell } from "../ui/product-shell";
import {
  audienceSignals,
  contentPillars,
  futureIdeas,
  identityTypes,
  platformPriorities,
  presenceGoals,
  recommendationInputs,
  voiceAttributes,
} from "../ui/scaffold-data";

export default function AccountPage() {
  return (
    <ProductShell
      activePath="/account"
      eyebrow="Account profile"
      title="Who you are shapes how the app should post"
      description="Use this screen to define the long-term strategic context behind every recommendation: what kind of creator or brand this is, what social is supposed to accomplish, how the voice should feel, and which platforms deserve the strongest slots."
      actions={
        <>
          <Link href="/onboarding" className="ritmio-button ritmio-button-secondary">
            Revisit onboarding
          </Link>
          <Link href="/accounts" className="ritmio-button ritmio-button-primary">
            Review linked platforms
          </Link>
        </>
      }
    >
      <section className="overview-grid">
        {audienceSignals.map((signal) => (
          <article key={signal.title} className="ritmio-card overview-card">
            <span>{signal.title}</span>
            <strong>{signal.value}</strong>
          </article>
        ))}
      </section>

      <div className="accounts-layout">
        <section className="stack-list">
          <section className="ritmio-card surface-card">
            <div className="surface-head">
              <div>
                <p className="ritmio-eyebrow">Identity</p>
                <h2>What kind of presence is this?</h2>
              </div>
            </div>

            <div className="chip-row">
              {identityTypes.map((type) => (
                <span
                  key={type}
                  className={`capability-chip ${
                    type === "Band" ? "capability-chip-selected" : ""
                  }`}
                >
                  {type}
                </span>
              ))}
            </div>
          </section>

          <section className="ritmio-card surface-card">
            <div className="surface-head">
              <div>
                <p className="ritmio-eyebrow">Presence goals</p>
                <h2>What should social media actually do?</h2>
              </div>
            </div>

            <div className="chip-row">
              {presenceGoals.map((goal) => (
                <span
                  key={goal}
                  className={`capability-chip ${
                    goal === "Grow fandom" || goal === "Sell tickets"
                      ? "capability-chip-selected"
                      : ""
                  }`}
                >
                  {goal}
                </span>
              ))}
            </div>
          </section>

          <section className="ritmio-card surface-card">
            <div className="surface-head">
              <div>
                <p className="ritmio-eyebrow">Voice and behavior</p>
                <h2>How the brand should sound</h2>
              </div>
            </div>

            <div className="chip-row">
              {voiceAttributes.map((attribute) => (
                <span key={attribute} className="capability-chip capability-chip-alt">
                  {attribute}
                </span>
              ))}
            </div>
          </section>

          <section className="ritmio-card surface-card">
            <div className="surface-head">
              <div>
                <p className="ritmio-eyebrow">Content pillars</p>
                <h2>What the calendar should pull from</h2>
              </div>
            </div>

            <div className="stack-list">
              {contentPillars.map((pillar) => (
                <article key={pillar.title} className="insight-card">
                  <strong>{pillar.title}</strong>
                  <p>{pillar.body}</p>
                </article>
              ))}
            </div>
          </section>
        </section>

        <div className="rail-layout">
          <section className="ritmio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="ritmio-eyebrow">Platform priorities</p>
                <h2>Where the best slots go first</h2>
              </div>
            </div>

            <div className="stack-list">
              {platformPriorities.map((item) => (
                <article key={item.platform} className="list-row list-row-stack">
                  <div>
                    <strong>{item.platform}</strong>
                    <p>{item.role}</p>
                  </div>
                  <span className="state-badge status-info">{item.priority}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="ritmio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="ritmio-eyebrow">Recommendation inputs</p>
                <h2>What timing logic should respect</h2>
              </div>
            </div>

            <div className="stack-list">
              {recommendationInputs.map((item) => (
                <article key={item.label} className="insight-card">
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="ritmio-card surface-card">
            <div className="surface-head compact-head">
              <div>
                <p className="ritmio-eyebrow">Future ideas</p>
                <h2>Worth building into the product</h2>
              </div>
            </div>

            <div className="stack-list">
              {futureIdeas.map((item) => (
                <article key={item.title} className="insight-card">
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </ProductShell>
  );
}

import Link from "next/link";
import {
  identityTypes,
  onboardingPreview,
  onboardingSteps,
  platformPriorities,
  presenceGoals,
} from "../ui/scaffold-data";

export default function OnboardingPage() {
  return (
    <main className="workspace-page">
      <div className="brilhio-shell onboarding-page">
        <header className="onboarding-header">
          <div>
            <p className="brilhio-eyebrow">First-time login</p>
            <h1>Set the strategy before the calendar fills up.</h1>
            <p>
              This onboarding flow should establish identity, goals, platform
              priorities, account connections, and the first round of timing
              guidance before the user lands on the weekly board.
            </p>
          </div>
          <div className="page-actions">
            <Link href="/account" className="brilhio-button brilhio-button-secondary">
              Skip to account profile
            </Link>
            <Link href="/dashboard" className="brilhio-button brilhio-button-primary">
              Preview dashboard
            </Link>
          </div>
        </header>

        <div className="onboarding-layout">
          <section className="brilhio-card surface-card onboarding-steps">
            <div className="surface-head">
              <div>
                <p className="brilhio-eyebrow">Flow outline</p>
                <h2>What first-time setup should cover</h2>
              </div>
            </div>

            <div className="stack-list">
              {onboardingSteps.map((step) => (
                <article key={step.title} className="step-card">
                  <span className="workflow-index">{step.step}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="rail-layout">
            <section className="brilhio-card surface-card">
              <div className="surface-head compact-head">
                <div>
                  <p className="brilhio-eyebrow">Identity selection</p>
                  <h2>Who are you?</h2>
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

            <section className="brilhio-card surface-card">
              <div className="surface-head compact-head">
                <div>
                  <p className="brilhio-eyebrow">Goals</p>
                  <h2>What is social for?</h2>
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

            <section className="brilhio-card surface-card">
              <div className="surface-head compact-head">
                <div>
                  <p className="brilhio-eyebrow">Platform order</p>
                  <h2>Where should Brilhio focus first?</h2>
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

            <section className="brilhio-card surface-card">
              <div className="surface-head compact-head">
                <div>
                  <p className="brilhio-eyebrow">Starter recommendations</p>
                  <h2>What onboarding should produce immediately</h2>
                </div>
              </div>

              <div className="stack-list">
                {onboardingPreview.map((item) => (
                  <article key={item.title} className="insight-card">
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

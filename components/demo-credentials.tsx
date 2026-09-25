"use client";

/* The demo accounts are real: the admin one reaches /admin. So the block is opt-in
   behind a build-time flag, and both branches below are compiled away when it is
   off - the credentials never reach the bundle of a deployment that leaves it
   unset. `.env.example` documents the switch. */
const ENABLED = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true";

const DEMO_ACCOUNTS = [
  {
    label: "Learner",
    email: "learner@ai360degree.demo",
    password: "DemoLearner#2026",
  },
  {
    label: "Admin",
    email: "admin@ai360degree.demo",
    password: "DemoAdmin#2026",
  },
] as const;

/* The fields are uncontrolled - the pen tree draws its own boxes - so the fill is
   done on the DOM node by id, then an input event is dispatched so any React
   listener on the field sees the new value the same way it would a keystroke. */
function fillField(id: string, value: string) {
  const field = document.getElementById(id);
  if (!(field instanceof HTMLInputElement)) return;
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

export function DemoCredentials({
  emailId,
  passwordId,
}: {
  emailId: string;
  passwordId: string;
}) {
  if (!ENABLED) return null;

  return (
    <aside className="demo-credentials" aria-label="Demo accounts">
      <p className="demo-credentials__title">Demo accounts</p>
      <div className="demo-credentials__cards">
        {DEMO_ACCOUNTS.map((account) => (
          <div key={account.label} className="demo-credentials__card">
            <p className="demo-credentials__role">{account.label}</p>
            <p className="demo-credentials__value">{account.email}</p>
            <p className="demo-credentials__value demo-credentials__value--secret">
              {account.password}
            </p>
            <button
              type="button"
              className="demo-credentials__fill"
              onClick={() => {
                fillField(emailId, account.email);
                fillField(passwordId, account.password);
              }}
            >
              Fill {account.label} details
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}

"use client";

import { useMemo, useState } from "react";

type View = "assess" | "dashboard" | "proposals" | "rules";
type ProjectType = "landing" | "business" | "ecommerce" | "webapp";

type FormState = {
  projectName: string;
  clientName: string;
  clientEmail: string;
  projectType: ProjectType;
  pages: number;
  sections: number;
  contentReady: boolean;
  bilingual: boolean;
  booking: boolean;
  payments: boolean;
  clientLogin: boolean;
  customDesign: boolean;
  rush: boolean;
  maintenance: boolean;
  notes: string;
};

type Assessment = {
  packageName: "Promotional" | "Professional" | "Custom";
  grade: "A" | "B" | "C";
  price: number;
  range: string;
  score: number;
  reasons: string[];
  included: string[];
  extras: string[];
};

const initialForm: FormState = {
  projectName: "",
  clientName: "",
  clientEmail: "",
  projectType: "landing",
  pages: 1,
  sections: 4,
  contentReady: true,
  bilingual: false,
  booking: false,
  payments: false,
  clientLogin: false,
  customDesign: false,
  rush: false,
  maintenance: true,
  notes: "",
};

const projectTypes: Array<{ value: ProjectType; label: string; detail: string }> = [
  { value: "landing", label: "Landing page", detail: "Single focused page" },
  { value: "business", label: "Business website", detail: "Multi-page presence" },
  { value: "ecommerce", label: "Online store", detail: "Products and payments" },
  { value: "webapp", label: "Web application", detail: "Accounts and workflows" },
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
}

function assessProject(form: FormState): Assessment {
  let score = { landing: 1, business: 5, ecommerce: 13, webapp: 17 }[form.projectType];
  score += Math.max(0, form.pages - 1);
  score += Math.max(0, form.sections - 4) * 0.5;
  score += form.bilingual ? 3 : 0;
  score += form.booking ? 3 : 0;
  score += form.payments ? 5 : 0;
  score += form.clientLogin ? 7 : 0;
  score += form.customDesign ? 3 : 0;
  score += form.rush ? 2 : 0;
  score += form.contentReady ? 0 : 2;

  const promotional =
    form.projectType === "landing" &&
    form.pages === 1 &&
    form.sections <= 4 &&
    !form.bilingual && !form.booking && !form.payments &&
    !form.clientLogin && !form.customDesign && !form.rush;

  const professional =
    !promotional &&
    (form.projectType === "landing" || form.projectType === "business") &&
    score < 16 && !form.clientLogin;

  if (promotional) {
    return {
      packageName: "Promotional",
      grade: "A",
      price: 99.99,
      range: "$99.99 fixed scope",
      score: Math.round(score),
      reasons: [
        "One-page website with a focused goal",
        "Four or fewer standard content sections",
        "No advanced integrations or custom workflows",
      ],
      included: [
        "Responsive one-page website",
        "Up to 4 content sections",
        "Contact form + WhatsApp button",
        "Delivery target: 5 business days",
      ],
      extras: form.maintenance
        ? ["Website Care Plan — $97/month after the free first month"]
        : [],
    };
  }

  if (professional) {
    let price = 699;
    price += Math.max(0, form.pages - 5) * 125;
    price += form.bilingual ? 250 : 0;
    price += form.booking ? 300 : 0;
    price += form.payments ? 450 : 0;
    price += form.customDesign ? 350 : 0;
    price += form.contentReady ? 0 : 150;
    price = form.rush ? price * 1.25 : price;
    price = Math.round(price / 25) * 25;

    return {
      packageName: "Professional",
      grade: "B",
      price,
      range: `${money(price)} recommended`,
      score: Math.round(score),
      reasons: [
        form.pages > 1
          ? `${form.pages}-page website requires expanded design and navigation`
          : "The requested scope exceeds the promotional package",
        form.bilingual
          ? "Bilingual content adds an additional production pass"
          : "Professional presentation and custom layout are required",
        form.booking || form.payments
          ? "Business integration requires setup and testing"
          : "Scope remains within a standard business website",
      ],
      included: [
        `Up to ${Math.max(5, form.pages)} professionally designed pages`,
        "Mobile, tablet and desktop optimization",
        "Contact and lead capture setup",
        "Basic on-page SEO foundation",
      ],
      extras: [
        form.bilingual ? "English + Spanish content structure" : "",
        form.booking ? "Booking or appointment integration" : "",
        form.payments ? "Payment integration" : "",
        form.maintenance ? "Website Care Plan — $97/month after the free first month" : "",
      ].filter(Boolean),
    };
  }

  let price = form.projectType === "webapp" ? 2499 : 1699;
  price += Math.max(0, form.pages - 5) * 150;
  price += form.bilingual ? 300 : 0;
  price += form.booking ? 350 : 0;
  price += form.payments ? 600 : 0;
  price += form.clientLogin ? 900 : 0;
  price += form.customDesign ? 500 : 0;
  price += form.contentReady ? 0 : 250;
  price = form.rush ? price * 1.25 : price;
  price = Math.round(price / 50) * 50;

  return {
    packageName: "Custom",
    grade: "C",
    price,
    range: `Starting at ${money(price)}`,
    score: Math.round(score),
    reasons: [
      form.projectType === "ecommerce"
        ? "Online selling introduces products, checkout and payment workflows"
        : form.projectType === "webapp"
          ? "User accounts and application workflows require custom development"
          : "The combination of features exceeds a standard website build",
      form.clientLogin
        ? "Secure customer accounts require authentication and protected data"
        : "Multiple advanced integrations require dedicated testing",
      "A discovery session is required before a fixed proposal",
    ],
    included: [
      "Project discovery and technical scope",
      "Custom interface and responsive experience",
      "Integration setup and quality assurance",
      "Milestone-based delivery plan",
    ],
    extras: [
      form.payments ? "Secure payment workflow" : "",
      form.clientLogin ? "Customer login and protected portal" : "",
      form.bilingual ? "Bilingual interface structure" : "",
      form.maintenance ? "Custom care plan after launch" : "",
    ].filter(Boolean),
  };
}

const navItems: Array<{ id: View; label: string; short: string }> = [
  { id: "assess", label: "New assessment", short: "01" },
  { id: "dashboard", label: "Dashboard", short: "02" },
  { id: "proposals", label: "Proposals", short: "03" },
  { id: "rules", label: "Pricing rules", short: "04" },
];

export default function Home() {
  const [view, setView] = useState<View>("assess");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [proposalCreated, setProposalCreated] = useState(false);
  const assessment = useMemo(() => assessProject(form), [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetAssessment() {
    setForm(initialForm);
    setStep(1);
    setProposalCreated(false);
  }

  function createProposal() {
    setProposalCreated(true);
    setView("proposals");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("assess")} aria-label="Go to new assessment">
          <span className="brand-mark">SG</span>
          <span><strong>ScopeGrade</strong><small>AI project qualifier</small></span>
        </button>

        <nav className="nav-list" aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}>
              <span>{item.short}</span>{item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-insight">
          <span className="pulse-dot" />
          <p>Pricing engine active</p>
          <small>Rules synced to MADEVHUB packages</small>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">JM</div>
          <div><strong>Juan Masis</strong><small>Workspace owner</small></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">ScopeGrade AI</span><h1>{navItems.find((item) => item.id === view)?.label}</h1></div>
          <div className="topbar-actions">
            <span className="status-pill"><i /> Rule set v1.0</span>
            <button className="new-button" onClick={() => { setView("assess"); resetAssessment(); }}><span>+</span> New project</button>
          </div>
        </header>

        {view === "assess" && <AssessmentView step={step} setStep={setStep} form={form} update={update} assessment={assessment} resetAssessment={resetAssessment} createProposal={createProposal} />}
        {view === "dashboard" && <DashboardView setView={setView} setStep={setStep} />}
        {view === "proposals" && <ProposalsView proposalCreated={proposalCreated} form={form} assessment={assessment} setView={setView} />}
        {view === "rules" && <RulesView />}
      </section>
    </main>
  );
}

function AssessmentView({ step, setStep, form, update, assessment, resetAssessment, createProposal }: {
  step: number;
  setStep: (step: number) => void;
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  assessment: Assessment;
  resetAssessment: () => void;
  createProposal: () => void;
}) {
  const canContinue = form.projectName.trim() && form.clientName.trim();
  return (
    <div className="content-wrap assessment-layout">
      <section className="assessment-main">
        <div className="intro-row">
          <div><span className="section-kicker">Project intake</span><h2>Price the scope with confidence.</h2><p>Answer a few questions. ScopeGrade will classify the project, explain the decision and recommend the right starting price.</p></div>
          <button className="text-button" onClick={resetAssessment}>Reset</button>
        </div>

        <div className="stepper" aria-label="Assessment progress">
          {["Client & project", "Scope & features", "Grade & proposal"].map((label, index) => (
            <button key={label} className={step === index + 1 ? "step active" : step > index + 1 ? "step complete" : "step"} onClick={() => step > index + 1 && setStep(index + 1)} disabled={step < index + 1}>
              <span>{step > index + 1 ? "✓" : index + 1}</span><em>{label}</em>
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="form-card">
            <div className="form-heading"><span>01</span><div><h3>Tell us about the opportunity</h3><p>Basic information for the scope record and proposal.</p></div></div>
            <div className="field-grid">
              <label className="field full"><span>Project name</span><input value={form.projectName} onChange={(e) => update("projectName", e.target.value)} placeholder="e.g. Atlas Construction Website" /></label>
              <label className="field"><span>Client name</span><input value={form.clientName} onChange={(e) => update("clientName", e.target.value)} placeholder="Full name" /></label>
              <label className="field"><span>Client email</span><input type="email" value={form.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} placeholder="client@company.com" /></label>
            </div>
            <fieldset className="type-fieldset">
              <legend>What are they asking you to build?</legend>
              <div className="type-grid">
                {projectTypes.map((type) => (
                  <button type="button" key={type.value} className={form.projectType === type.value ? "type-card selected" : "type-card"} onClick={() => update("projectType", type.value)} aria-pressed={form.projectType === type.value}>
                    <span className="type-icon">{type.label.charAt(0)}</span><strong>{type.label}</strong><small>{type.detail}</small><i>{form.projectType === type.value ? "✓" : ""}</i>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="form-actions end"><button className="primary-button" disabled={!canContinue} onClick={() => setStep(2)}>Continue to scope <span>→</span></button></div>
          </div>
        )}

        {step === 2 && (
          <div className="form-card">
            <div className="form-heading"><span>02</span><div><h3>Define the actual scope</h3><p>Every selection changes the complexity score and price.</p></div></div>
            <div className="number-grid">
              <NumberControl label="Pages" value={form.pages} min={1} max={30} onChange={(value) => update("pages", value)} />
              <NumberControl label="Homepage sections" value={form.sections} min={1} max={15} onChange={(value) => update("sections", value)} />
            </div>
            <div className="toggle-section">
              <div className="toggle-heading"><h4>Features and production needs</h4><span>Select everything requested</span></div>
              <div className="toggle-grid">
                <Toggle label="English + Spanish" detail="Bilingual structure" checked={form.bilingual} onChange={(v) => update("bilingual", v)} />
                <Toggle label="Booking system" detail="Appointments or calendar" checked={form.booking} onChange={(v) => update("booking", v)} />
                <Toggle label="Online payments" detail="Checkout or deposits" checked={form.payments} onChange={(v) => update("payments", v)} />
                <Toggle label="Customer login" detail="Accounts and private data" checked={form.clientLogin} onChange={(v) => update("clientLogin", v)} />
                <Toggle label="Custom design" detail="Unique visual system" checked={form.customDesign} onChange={(v) => update("customDesign", v)} />
                <Toggle label="Rush delivery" detail="Priority production" checked={form.rush} onChange={(v) => update("rush", v)} />
                <Toggle label="Content is ready" detail="Client provides final copy" checked={form.contentReady} onChange={(v) => update("contentReady", v)} />
                <Toggle label="Care plan" detail="$97/month after free month" checked={form.maintenance} onChange={(v) => update("maintenance", v)} />
              </div>
            </div>
            <label className="field full notes-field"><span>Internal notes <em>Optional</em></span><textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Add special requests, references or expectations mentioned by the client..." /></label>
            <div className="form-actions between"><button className="secondary-button" onClick={() => setStep(1)}>← Back</button><button className="primary-button" onClick={() => setStep(3)}>Calculate scope grade <span>→</span></button></div>
          </div>
        )}

        {step === 3 && (
          <div className="result-stack">
            <div className={`result-hero ${assessment.packageName.toLowerCase()}`}>
              <div className="result-topline"><span>Assessment complete</span><span className="confidence"><i /> 96% confidence</span></div>
              <div className="result-core">
                <div className="grade-orbit"><div><small>Grade</small><strong>{assessment.grade}</strong></div></div>
                <div className="result-copy"><span>Recommended package</span><h3>{assessment.packageName}</h3><p>{assessment.range}</p></div>
                <div className="result-price"><small>Recommended price</small><strong>{money(assessment.price)}</strong><span>Complexity score {assessment.score}/30</span></div>
              </div>
            </div>
            <div className="result-grid">
              <article className="analysis-card">
                <div className="card-title-row"><div><span className="section-kicker">Decision logic</span><h3>Why ScopeGrade chose this package</h3></div><span className="mini-grade">{assessment.grade}</span></div>
                <ul className="reason-list">{assessment.reasons.map((reason, index) => <li key={reason}><span>{String(index + 1).padStart(2, "0")}</span>{reason}</li>)}</ul>
              </article>
              <article className="scope-card">
                <span className="section-kicker">Suggested scope</span><h3>What the proposal should include</h3>
                <ul>{assessment.included.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul>
                {assessment.extras.length > 0 && <div className="extras-block"><small>Add-ons</small>{assessment.extras.map((item) => <p key={item}>+ {item}</p>)}</div>}
              </article>
            </div>
            <div className="proposal-bar"><div><span>Ready for the client</span><strong>Turn this assessment into a polished proposal.</strong></div><div><button className="secondary-button" onClick={() => setStep(2)}>Edit scope</button><button className="primary-button" onClick={createProposal}>Create proposal <span>→</span></button></div></div>
          </div>
        )}
      </section>

      <aside className="live-panel">
        <div className="live-panel-head"><span className="live-dot" /><div><strong>Live scope preview</strong><small>Updates as you make selections</small></div></div>
        <div className={`preview-grade ${assessment.packageName.toLowerCase()}`}><span>Current fit</span><strong>{assessment.packageName}</strong><p>{assessment.range}</p></div>
        <dl className="scope-metrics">
          <div><dt>Project type</dt><dd>{projectTypes.find((type) => type.value === form.projectType)?.label}</dd></div>
          <div><dt>Pages</dt><dd>{form.pages}</dd></div>
          <div><dt>Features</dt><dd>{[form.bilingual, form.booking, form.payments, form.clientLogin, form.customDesign].filter(Boolean).length}</dd></div>
          <div><dt>Complexity</dt><dd>{assessment.score}/30</dd></div>
        </dl>
        <div className="meter-block"><div><span>Scope complexity</span><strong>{Math.min(100, Math.round((assessment.score / 30) * 100))}%</strong></div><div className="meter"><i style={{ width: `${Math.min(100, Math.max(6, (assessment.score / 30) * 100))}%` }} /></div><small>Promotional <em>Professional</em> Custom</small></div>
        <div className="guardrail-card"><span>SG</span><div><strong>Price protection</strong><p>Advanced requests are automatically moved out of the $99.99 promotional scope.</p></div></div>
      </aside>
    </div>
  );
}

function NumberControl({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div className="number-control"><span>{label}</span><div><button onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Decrease ${label}`}>−</button><strong>{value}</strong><button onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Increase ${label}`}>+</button></div></div>;
}

function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" className={checked ? "toggle-card checked" : "toggle-card"} onClick={() => onChange(!checked)} aria-pressed={checked}><span className="switch"><i /></span><span><strong>{label}</strong><small>{detail}</small></span></button>;
}

function DashboardView({ setView, setStep }: { setView: (view: View) => void; setStep: (step: number) => void }) {
  const recent = [
    { client: "Martinez Roofing", project: "Lead generation website", package: "Professional", value: "$1,249", grade: "B", date: "Today" },
    { client: "Bella Studio", project: "Promotional landing page", package: "Promotional", value: "$99.99", grade: "A", date: "Yesterday" },
    { client: "Nova Commerce", project: "Online store rebuild", package: "Custom", value: "$3,150", grade: "C", date: "Aug 18" },
  ];
  return (
    <div className="content-wrap dashboard-page">
      <div className="dashboard-welcome"><div><span className="section-kicker">Overview</span><h2>Your scope pipeline, at a glance.</h2><p>Protect margins, qualify faster and keep every proposal consistent.</p></div><button className="primary-button" onClick={() => { setView("assess"); setStep(1); }}>Grade a new project <span>→</span></button></div>
      <div className="stat-grid"><Stat label="Assessments" value="24" change="+18% this month" /><Stat label="Quoted value" value="$18.4K" change="+$4.2K this month" /><Stat label="Avg. project" value="$767" change="Up from $514" /><Stat label="Scope protected" value="$6.8K" change="From underpricing" accent /></div>
      <section className="table-card">
        <div className="table-heading"><div><span className="section-kicker">Recent activity</span><h3>Latest assessments</h3></div><button onClick={() => setView("proposals")} className="text-button">View proposals →</button></div>
        <div className="responsive-table"><table><thead><tr><th>Client / project</th><th>Package</th><th>Grade</th><th>Recommended</th><th>Date</th></tr></thead><tbody>{recent.map((row) => <tr key={row.client}><td><strong>{row.client}</strong><small>{row.project}</small></td><td><span className={`package-tag ${row.package.toLowerCase()}`}>{row.package}</span></td><td><span className="table-grade">{row.grade}</span></td><td><strong>{row.value}</strong></td><td>{row.date}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

function Stat({ label, value, change, accent = false }: { label: string; value: string; change: string; accent?: boolean }) {
  return <article className={accent ? "stat-card accent" : "stat-card"}><span>{label}</span><strong>{value}</strong><small>{change}</small></article>;
}

function ProposalsView({ proposalCreated, form, assessment, setView }: { proposalCreated: boolean; form: FormState; assessment: Assessment; setView: (view: View) => void }) {
  return (
    <div className="content-wrap proposals-page">
      {proposalCreated && <div className="success-banner"><span>✓</span><div><strong>Proposal draft created</strong><p>Review the scope and pricing before sharing it with the client.</p></div></div>}
      <div className="dashboard-welcome"><div><span className="section-kicker">Sales documents</span><h2>Proposals built from protected scopes.</h2><p>Every price is tied to the features the client actually requested.</p></div><button className="primary-button" onClick={() => setView("assess")}>New assessment <span>→</span></button></div>
      <div className="proposal-grid">
        {proposalCreated && <article className="proposal-card featured"><div className="proposal-card-top"><span className={`package-tag ${assessment.packageName.toLowerCase()}`}>Draft · {assessment.packageName}</span><span>Just now</span></div><div className="proposal-client"><span>{(form.clientName || "NC").split(" ").map((part) => part[0]).join("").slice(0,2).toUpperCase()}</span><div><strong>{form.projectName || "New client project"}</strong><small>{form.clientName || "Client name"}</small></div></div><div className="proposal-value"><span>Proposed investment</span><strong>{money(assessment.price)}</strong></div><div className="proposal-actions"><button>Review proposal</button><button className="icon-button" aria-label="More proposal actions">•••</button></div></article>}
        <ProposalCard status="Sent" title="Martinez Roofing Website" client="Carlos Martinez" value="$1,249" date="Aug 20" />
        <ProposalCard status="Accepted" title="Bella Studio Landing Page" client="Isabella Reed" value="$99.99" date="Aug 19" />
      </div>
    </div>
  );
}

function ProposalCard({ status, title, client, value, date }: { status: string; title: string; client: string; value: string; date: string }) {
  return <article className="proposal-card"><div className="proposal-card-top"><span className={`proposal-status ${status.toLowerCase()}`}>{status}</span><span>{date}</span></div><div className="proposal-client"><span>{client.split(" ").map((part) => part[0]).join("").slice(0,2)}</span><div><strong>{title}</strong><small>{client}</small></div></div><div className="proposal-value"><span>Proposed investment</span><strong>{value}</strong></div><div className="proposal-actions"><button>Open proposal</button><button className="icon-button" aria-label="More proposal actions">•••</button></div></article>;
}

function RulesView() {
  const rules = [
    { name: "Promotional Website", price: "$99.99", grade: "A", description: "One page, up to 4 sections, standard contact features, no advanced integrations.", tone: "promo" },
    { name: "Professional Website", price: "From $699", grade: "B", description: "Multi-page business website with optional bilingual, booking and payment integrations.", tone: "professional" },
    { name: "Custom Project", price: "From $1,500", grade: "C", description: "E-commerce, customer accounts, web applications or projects requiring discovery.", tone: "custom" },
  ];
  return (
    <div className="content-wrap rules-page">
      <div className="dashboard-welcome"><div><span className="section-kicker">Qualification logic</span><h2>Your pricing guardrails.</h2><p>These rules determine when a project moves beyond the advertised promotional price.</p></div><span className="status-pill"><i /> Active rules</span></div>
      <div className="rules-grid">{rules.map((rule) => <article key={rule.name} className={`rule-card ${rule.tone}`}><div className="rule-top"><span>Grade {rule.grade}</span><strong>{rule.price}</strong></div><h3>{rule.name}</h3><p>{rule.description}</p><div className="rule-footer"><span>Automatic classification</span><i /></div></article>)}</div>
      <div className="rule-note"><span>i</span><div><strong>Prices remain under your control.</strong><p>ScopeGrade recommends a starting point. You review and approve every final quote before it reaches a client.</p></div></div>
    </div>
  );
}

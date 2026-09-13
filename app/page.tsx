"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import AuthGate from "./auth-gate";
import { createClient } from "../utils/supabase/client";
import {
  type AssessmentRecord,
  type ClientRecord,
  type ClientUpdateInput,
  loadWorkspaceData,
  type ProposalRecord,
  saveAssessmentAndProposal,
  setProposalSharing as updateProposalSharing,
  updateClientDetails,
  updateProposalStatus,
} from "../utils/supabase/workspace";

type View = "assess" | "clients" | "client-detail" | "dashboard" | "proposals" | "proposal-detail" | "rules";
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

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function fullDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
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
  { id: "clients", label: "Clients", short: "02" },
  { id: "dashboard", label: "Dashboard", short: "03" },
  { id: "proposals", label: "Proposals", short: "04" },
  { id: "rules", label: "Pricing rules", short: "05" },
];

export default function Home() {
  return (
    <AuthGate>
      {(user, signOut) => <ScopeGradeWorkspace user={user} onSignOut={signOut} />}
    </AuthGate>
  );
}

function ScopeGradeWorkspace({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const [view, setView] = useState<View>("assess");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [proposalCreated, setProposalCreated] = useState(false);
  const [clientRecords, setClientRecords] = useState<ClientRecord[]>([]);
  const [assessmentRecords, setAssessmentRecords] = useState<AssessmentRecord[]>([]);
  const [proposalRecords, setProposalRecords] = useState<ProposalRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [shareUpdating, setShareUpdating] = useState(false);
  const [saveError, setSaveError] = useState("");
  const assessment = useMemo(() => assessProject(form), [form]);
  const displayName = typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim()
    : user.email?.split("@")[0] ?? "Workspace owner";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const selectedProposal = proposalRecords.find((record) => record.id === selectedProposalId) ?? null;
  const selectedClient = clientRecords.find((record) => record.id === selectedClientId) ?? null;

  useEffect(() => {
    let active = true;
    setDataLoading(true);

    void loadWorkspaceData(createClient(), user.id)
      .then((data) => {
        if (!active) return;
        setClientRecords(data.clients);
        setAssessmentRecords(data.assessments);
        setProposalRecords(data.proposals);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSaveError(error instanceof Error ? error.message : "Unable to load workspace data.");
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetAssessment() {
    setForm(initialForm);
    setStep(1);
    setProposalCreated(false);
    setSaveError("");
  }

  async function createProposal() {
    setSaving(true);
    setSaveError("");

    try {
      const supabase = createClient();
      await saveAssessmentAndProposal(supabase, user.id, form, assessment);
      const data = await loadWorkspaceData(supabase, user.id);
      setClientRecords(data.clients);
      setAssessmentRecords(data.assessments);
      setProposalRecords(data.proposals);
      setProposalCreated(true);
      setView("proposals");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save this assessment.");
    } finally {
      setSaving(false);
    }
  }

  function openProposal(proposalId: string) {
    setSelectedProposalId(proposalId);
    setSaveError("");
    setView("proposal-detail");
  }

  function openClient(clientId: string) {
    setSelectedClientId(clientId);
    setSaveError("");
    setView("client-detail");
  }

  function startAssessmentForClient(client: ClientRecord) {
    setForm({
      ...initialForm,
      clientName: client.name,
      clientEmail: client.email ?? "",
    });
    setStep(1);
    setProposalCreated(false);
    setSaveError("");
    setView("assess");
  }

  async function saveClient(input: ClientUpdateInput) {
    if (!selectedClient) return;
    setClientSaving(true);
    setSaveError("");

    try {
      const updated = await updateClientDetails(createClient(), user.id, selectedClient.id, input);
      setClientRecords((current) => current.map((client) => client.id === updated.id ? updated : client));
      setAssessmentRecords((current) => current.map((record) => record.clientId === updated.id ? { ...record, clientName: updated.name } : record));
      setProposalRecords((current) => current.map((record) => record.clientId === updated.id ? { ...record, clientName: updated.name, clientEmail: updated.email } : record));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save client details.");
      throw error;
    } finally {
      setClientSaving(false);
    }
  }

  async function changeProposalStatus(status: ProposalRecord["status"]) {
    if (!selectedProposal) return;
    setStatusUpdating(true);
    setSaveError("");

    try {
      await updateProposalStatus(createClient(), user.id, selectedProposal.id, status);
      setProposalRecords((current) => current.map((record) => (
        record.id === selectedProposal.id ? { ...record, status } : record
      )));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to update this proposal.");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function changeProposalSharing(enabled: boolean) {
    if (!selectedProposal) return;
    setShareUpdating(true);
    setSaveError("");

    try {
      const result = await updateProposalSharing(
        createClient(),
        user.id,
        selectedProposal.id,
        selectedProposal.status,
        enabled,
      );
      setProposalRecords((current) => current.map((record) => (
        record.id === selectedProposal.id
          ? {
              ...record,
              publicToken: result.publicToken,
              publicEnabled: result.publicEnabled,
              sharedAt: result.sharedAt,
              status: result.status,
            }
          : record
      )));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to update proposal sharing.");
    } finally {
      setShareUpdating(false);
    }
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
            <button key={item.id} className={view === item.id || (view === "client-detail" && item.id === "clients") || (view === "proposal-detail" && item.id === "proposals") ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}>
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
          <div className="avatar">{initials}</div>
          <div className="sidebar-user"><strong>{displayName}</strong><small>{user.email}</small></div>
          <button className="signout-button" type="button" onClick={() => void onSignOut()} aria-label="Sign out" title="Sign out">↗</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">ScopeGrade AI</span><h1>{view === "proposal-detail" ? "Proposal details" : view === "client-detail" ? "Client profile" : navItems.find((item) => item.id === view)?.label}</h1></div>
          <div className="topbar-actions">
            <span className="status-pill"><i /> Rule set v1.0</span>
            <button className="new-button" onClick={() => { setView("assess"); resetAssessment(); }}><span>+</span> New project</button>
          </div>
        </header>

        {view === "assess" && <AssessmentView step={step} setStep={setStep} form={form} update={update} assessment={assessment} resetAssessment={resetAssessment} createProposal={createProposal} saving={saving} saveError={saveError} />}
        {view === "clients" && <ClientsView clients={clientRecords} assessments={assessmentRecords} proposals={proposalRecords} loading={dataLoading} onOpen={openClient} onNewAssessment={() => { setForm(initialForm); setStep(1); setView("assess"); }} />}
        {view === "client-detail" && selectedClient && <ClientDetailView client={selectedClient} assessments={assessmentRecords.filter((record) => record.clientId === selectedClient.id)} proposals={proposalRecords.filter((record) => record.clientId === selectedClient.id)} onBack={() => setView("clients")} onStartAssessment={() => startAssessmentForClient(selectedClient)} onOpenProposal={openProposal} onSave={saveClient} saving={clientSaving} error={saveError} />}
        {view === "dashboard" && <DashboardView setView={setView} setStep={setStep} records={assessmentRecords} loading={dataLoading} />}
        {view === "proposals" && <ProposalsView proposalCreated={proposalCreated} records={proposalRecords} setView={setView} loading={dataLoading} onOpen={openProposal} />}
        {view === "proposal-detail" && selectedProposal && <ProposalDetailView record={selectedProposal} ownerName={displayName} ownerEmail={user.email ?? ""} onBack={() => setView("proposals")} onChangeStatus={changeProposalStatus} onChangeSharing={changeProposalSharing} updating={statusUpdating} shareUpdating={shareUpdating} error={saveError} />}
        {view === "rules" && <RulesView />}
      </section>
    </main>
  );
}

function AssessmentView({ step, setStep, form, update, assessment, resetAssessment, createProposal, saving, saveError }: {
  step: number;
  setStep: (step: number) => void;
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  assessment: Assessment;
  resetAssessment: () => void;
  createProposal: () => Promise<void>;
  saving: boolean;
  saveError: string;
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
            <div className="proposal-bar"><div><span>Ready for the client</span><strong>Save this assessment and create a proposal draft.</strong></div><div><button className="secondary-button" onClick={() => setStep(2)} disabled={saving}>Edit scope</button><button className="primary-button" onClick={() => void createProposal()} disabled={saving}>{saving ? "Saving…" : "Save & create proposal"} {!saving && <span>→</span>}</button></div></div>
            {saveError && <p className="save-error" role="alert">{saveError}</p>}
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

function DashboardView({ setView, setStep, records, loading }: {
  setView: (view: View) => void;
  setStep: (step: number) => void;
  records: AssessmentRecord[];
  loading: boolean;
}) {
  const quotedValue = records.reduce((total, record) => total + record.price, 0);
  const averageProject = records.length ? quotedValue / records.length : 0;
  const scopeProtected = records.reduce((total, record) => total + Math.max(0, record.price - 99.99), 0);
  const recent = records.slice(0, 10);

  return (
    <div className="content-wrap dashboard-page">
      <div className="dashboard-welcome"><div><span className="section-kicker">Overview</span><h2>Your scope pipeline, at a glance.</h2><p>Protect margins, qualify faster and keep every proposal consistent.</p></div><button className="primary-button" onClick={() => { setView("assess"); setStep(1); }}>Grade a new project <span>→</span></button></div>
      <div className="stat-grid"><Stat label="Assessments" value={loading ? "—" : String(records.length)} change="Saved assessments" /><Stat label="Quoted value" value={loading ? "—" : money(quotedValue)} change="Total recommended value" /><Stat label="Avg. project" value={loading ? "—" : money(averageProject)} change="Average recommended price" /><Stat label="Scope protected" value={loading ? "—" : money(scopeProtected)} change="Compared with $99.99 pricing" accent /></div>
      <section className="table-card">
        <div className="table-heading"><div><span className="section-kicker">Recent activity</span><h3>Latest assessments</h3></div><button onClick={() => setView("proposals")} className="text-button">View proposals →</button></div>
        {loading ? (
          <div className="empty-state"><span className="auth-spinner" /><strong>Loading your workspace…</strong></div>
        ) : recent.length === 0 ? (
          <div className="empty-state"><span>SG</span><strong>No assessments yet</strong><p>Grade your first client project to populate the dashboard.</p><button className="primary-button" onClick={() => { setView("assess"); setStep(1); }}>Create first assessment</button></div>
        ) : (
          <div className="responsive-table"><table><thead><tr><th>Client / project</th><th>Package</th><th>Grade</th><th>Recommended</th><th>Date</th></tr></thead><tbody>{recent.map((row) => <tr key={row.id}><td><strong>{row.clientName}</strong><small>{row.projectName}</small></td><td><span className={`package-tag ${row.packageName.toLowerCase()}`}>{row.packageName}</span></td><td><span className="table-grade">{row.grade}</span></td><td><strong>{money(row.price)}</strong></td><td>{shortDate(row.createdAt)}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, change, accent = false }: { label: string; value: string; change: string; accent?: boolean }) {
  return <article className={accent ? "stat-card accent" : "stat-card"}><span>{label}</span><strong>{value}</strong><small>{change}</small></article>;
}

function ClientsView({ clients, assessments, proposals, loading, onOpen, onNewAssessment }: {
  clients: ClientRecord[];
  assessments: AssessmentRecord[];
  proposals: ProposalRecord[];
  loading: boolean;
  onOpen: (clientId: string) => void;
  onNewAssessment: () => void;
}) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const visibleClients = clients.filter((client) => (
    !normalizedSearch || [client.name, client.company, client.email, client.phone]
      .some((value) => value?.toLowerCase().includes(normalizedSearch))
  ));
  const totalQuoted = proposals.reduce((total, proposal) => total + proposal.value, 0);
  const activeProposals = proposals.filter((proposal) => ["draft", "sent", "viewed"].includes(proposal.status)).length;

  return (
    <div className="content-wrap clients-page">
      <div className="dashboard-welcome">
        <div><span className="section-kicker">Client workspace</span><h2>Every relationship, scope and proposal.</h2><p>Keep client details and project history together from the first assessment to approval.</p></div>
        <button className="primary-button" onClick={onNewAssessment}>New assessment <span>→</span></button>
      </div>

      <div className="client-summary">
        <Stat label="Clients" value={loading ? "—" : String(clients.length)} change="Saved contacts" />
        <Stat label="Assessments" value={loading ? "—" : String(assessments.length)} change="Qualified projects" />
        <Stat label="Active proposals" value={loading ? "—" : String(activeProposals)} change="Draft, sent or viewed" />
        <Stat label="Total quoted" value={loading ? "—" : money(totalQuoted)} change="Across all clients" accent />
      </div>

      <section className="client-directory">
        <div className="client-directory-toolbar">
          <div><span className="section-kicker">Directory</span><h3>All clients</h3></div>
          <label className="client-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, company or email" aria-label="Search clients" /></label>
        </div>

        {loading ? (
          <div className="empty-state"><span className="auth-spinner" /><strong>Loading clients…</strong></div>
        ) : clients.length === 0 ? (
          <div className="empty-state"><span>SG</span><strong>No clients yet</strong><p>Your first client is created automatically when you save an assessment.</p><button className="primary-button" onClick={onNewAssessment}>Create first assessment</button></div>
        ) : visibleClients.length === 0 ? (
          <div className="empty-state compact"><span>⌕</span><strong>No matching clients</strong><p>Try a different name, company, email or phone number.</p></div>
        ) : (
          <div className="client-list">
            {visibleClients.map((client) => {
              const clientAssessments = assessments.filter((record) => record.clientId === client.id);
              const clientProposals = proposals.filter((record) => record.clientId === client.id);
              const quoted = clientProposals.reduce((total, proposal) => total + proposal.value, 0);
              const initials = client.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
              return (
                <article className="client-row" key={client.id}>
                  <button className="client-identity" onClick={() => onOpen(client.id)}>
                    <span className="client-avatar">{initials || "CL"}</span>
                    <span><strong>{client.name}</strong><small>{client.company || client.email || "Contact details not added"}</small></span>
                  </button>
                  <div className="client-contact"><span>Contact</span><strong>{client.email || "No email"}</strong><small>{client.phone || "No phone"}</small></div>
                  <div className="client-metric"><span>Activity</span><strong>{clientAssessments.length} assessment{clientAssessments.length === 1 ? "" : "s"}</strong><small>{clientProposals.length} proposal{clientProposals.length === 1 ? "" : "s"}</small></div>
                  <div className="client-metric"><span>Quoted</span><strong>{money(quoted)}</strong><small>Since {shortDate(client.createdAt)}</small></div>
                  <button className="client-open-button" onClick={() => onOpen(client.id)}>Open client <span>→</span></button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ClientDetailView({ client, assessments, proposals, onBack, onStartAssessment, onOpenProposal, onSave, saving, error }: {
  client: ClientRecord;
  assessments: AssessmentRecord[];
  proposals: ProposalRecord[];
  onBack: () => void;
  onStartAssessment: () => void;
  onOpenProposal: (proposalId: string) => void;
  onSave: (input: ClientUpdateInput) => Promise<void>;
  saving: boolean;
  error: string;
}) {
  const [details, setDetails] = useState<ClientUpdateInput>({ name: client.name, company: client.company ?? "", email: client.email ?? "", phone: client.phone ?? "", notes: client.notes ?? "" });
  const [saved, setSaved] = useState(false);
  const initials = client.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const totalQuoted = proposals.reduce((total, proposal) => total + proposal.value, 0);
  const acceptedValue = proposals.filter((proposal) => proposal.status === "accepted").reduce((total, proposal) => total + proposal.value, 0);

  useEffect(() => {
    setDetails({ name: client.name, company: client.company ?? "", email: client.email ?? "", phone: client.phone ?? "", notes: client.notes ?? "" });
    setSaved(false);
  }, [client]);

  function updateDetail(key: keyof ClientUpdateInput, value: string) {
    setDetails((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details.name.trim()) return;
    try {
      await onSave(details);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  return (
    <div className="content-wrap client-detail-page">
      <div className="client-detail-toolbar"><button className="secondary-button" onClick={onBack}>← Back to clients</button><button className="primary-button" onClick={onStartAssessment}>New assessment <span>→</span></button></div>

      <section className="client-profile-hero">
        <span className="client-profile-avatar">{initials || "CL"}</span>
        <div><span className="section-kicker">Client profile</span><h2>{client.name}</h2><p>{client.company || client.email || "Add company and contact information below."}</p></div>
        <div className="client-profile-since"><span>Client since</span><strong>{fullDate(client.createdAt)}</strong></div>
      </section>

      <div className="client-detail-stats"><Stat label="Assessments" value={String(assessments.length)} change="Qualified projects" /><Stat label="Proposals" value={String(proposals.length)} change="Created documents" /><Stat label="Total quoted" value={money(totalQuoted)} change="Potential project value" /><Stat label="Accepted" value={money(acceptedValue)} change="Approved proposal value" accent /></div>

      <div className="client-detail-grid">
        <form className="client-edit-card" onSubmit={(event) => void submit(event)}>
          <div className="client-card-heading"><div><span className="section-kicker">Contact record</span><h3>Client details</h3></div><span>Editable</span></div>
          <div className="field-grid">
            <label className="field"><span>Client name</span><input value={details.name} onChange={(event) => updateDetail("name", event.target.value)} required /></label>
            <label className="field"><span>Company</span><input value={details.company} onChange={(event) => updateDetail("company", event.target.value)} placeholder="Company name" /></label>
            <label className="field"><span>Email address</span><input type="email" value={details.email} onChange={(event) => updateDetail("email", event.target.value)} placeholder="client@company.com" /></label>
            <label className="field"><span>Phone number</span><input type="tel" value={details.phone} onChange={(event) => updateDetail("phone", event.target.value)} placeholder="(555) 000-0000" /></label>
            <label className="field full"><span>Internal notes</span><textarea value={details.notes} onChange={(event) => updateDetail("notes", event.target.value)} placeholder="Decision makers, preferences, follow-up notes…" /></label>
          </div>
          {saved && !error && <p className="client-save-success"><span>✓</span> Client details saved.</p>}
          {error && <p className="save-error" role="alert">{error}</p>}
          <div className="client-form-actions"><small>Changes are stored securely in your Supabase workspace.</small><button className="primary-button" type="submit" disabled={saving || !details.name.trim()}>{saving ? "Saving…" : "Save client"} {!saving && <span>→</span>}</button></div>
        </form>

        <aside className="client-quick-card">
          <span className="section-kicker">Quick contact</span><h3>Reach {client.name.split(" ")[0]}</h3>
          <dl><div><dt>Email</dt><dd>{client.email ? <a href={`mailto:${client.email}`}>{client.email}</a> : "Not added"}</dd></div><div><dt>Phone</dt><dd>{client.phone ? <a href={`tel:${client.phone}`}>{client.phone}</a> : "Not added"}</dd></div><div><dt>Company</dt><dd>{client.company || "Not added"}</dd></div></dl>
          <button className="secondary-button" onClick={onStartAssessment}>Start project for this client</button>
        </aside>
      </div>

      <section className="client-history-grid">
        <article className="client-history-card">
          <div className="client-card-heading"><div><span className="section-kicker">Qualification history</span><h3>Assessments</h3></div><span>{assessments.length}</span></div>
          {assessments.length === 0 ? <div className="client-mini-empty"><strong>No assessments yet</strong><p>Start a new project to build this client&apos;s scope history.</p></div> : <div className="client-history-list">{assessments.map((record) => <div key={record.id}><span className="table-grade">{record.grade}</span><p><strong>{record.projectName}</strong><small>{record.packageName} · {shortDate(record.createdAt)}</small></p><b>{money(record.price)}</b></div>)}</div>}
        </article>

        <article className="client-history-card">
          <div className="client-card-heading"><div><span className="section-kicker">Sales history</span><h3>Proposals</h3></div><span>{proposals.length}</span></div>
          {proposals.length === 0 ? <div className="client-mini-empty"><strong>No proposals yet</strong><p>Saving an assessment creates a proposal draft automatically.</p></div> : <div className="client-history-list proposal-history">{proposals.map((record) => <button key={record.id} onClick={() => onOpenProposal(record.id)}><span className={`proposal-status ${record.status}`}>{record.status}</span><p><strong>{record.title}</strong><small>{record.proposalNumber} · {shortDate(record.createdAt)}</small></p><b>{money(record.value)} <em>→</em></b></button>)}</div>}
        </article>
      </section>
    </div>
  );
}

function ProposalsView({ proposalCreated, records, setView, loading, onOpen }: {
  proposalCreated: boolean;
  records: ProposalRecord[];
  setView: (view: View) => void;
  loading: boolean;
  onOpen: (proposalId: string) => void;
}) {
  return (
    <div className="content-wrap proposals-page">
      {proposalCreated && <div className="success-banner"><span>✓</span><div><strong>Assessment and proposal saved</strong><p>Your new records are now protected in the ScopeGrade database.</p></div></div>}
      <div className="dashboard-welcome"><div><span className="section-kicker">Sales documents</span><h2>Proposals built from protected scopes.</h2><p>Every price is tied to the features the client actually requested.</p></div><button className="primary-button" onClick={() => setView("assess")}>New assessment <span>→</span></button></div>
      {loading ? (
        <div className="empty-state proposal-empty"><span className="auth-spinner" /><strong>Loading proposals…</strong></div>
      ) : records.length === 0 ? (
        <div className="empty-state proposal-empty"><span>SG</span><strong>No proposals yet</strong><p>Complete an assessment and ScopeGrade will create the first draft.</p><button className="primary-button" onClick={() => setView("assess")}>Create first assessment</button></div>
      ) : (
        <div className="proposal-grid">
          {records.map((record, index) => <ProposalCard key={record.id} featured={proposalCreated && index === 0} status={record.status} title={record.title} client={record.clientName} value={record.value} date={shortDate(record.createdAt)} onOpen={() => onOpen(record.id)} />)}
        </div>
      )}
    </div>
  );
}

function ProposalCard({ status, title, client, value, date, featured = false, onOpen }: { status: ProposalRecord["status"]; title: string; client: string; value: number; date: string; featured?: boolean; onOpen: () => void }) {
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  return <article className={featured ? "proposal-card featured" : "proposal-card"}><div className="proposal-card-top"><span className={`proposal-status ${status}`}>{statusLabel}</span><span>{date}</span></div><div className="proposal-client"><span>{client.split(" ").map((part) => part[0]).join("").slice(0,2).toUpperCase()}</span><div><strong>{title}</strong><small>{client}</small></div></div><div className="proposal-value"><span>Proposed investment</span><strong>{money(value)}</strong></div><div className="proposal-actions"><button onClick={onOpen}>Open proposal</button><button className="icon-button" aria-label="More proposal actions">•••</button></div></article>;
}

function ProposalDetailView({ record, ownerName, ownerEmail, onBack, onChangeStatus, onChangeSharing, updating, shareUpdating, error }: {
  record: ProposalRecord;
  ownerName: string;
  ownerEmail: string;
  onBack: () => void;
  onChangeStatus: (status: ProposalRecord["status"]) => Promise<void>;
  onChangeSharing: (enabled: boolean) => Promise<void>;
  updating: boolean;
  shareUpdating: boolean;
  error: string;
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const statusLabel = record.status.charAt(0).toUpperCase() + record.status.slice(1);
  const created = new Date(record.createdAt);
  const fallbackExpiry = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
  const expirationDate = record.validUntil
    ? fullDate(`${record.validUntil}T12:00:00`)
    : fullDate(fallbackExpiry.toISOString());
  const nextStatus = record.status === "draft"
    ? "sent"
    : record.status === "sent" || record.status === "viewed"
      ? "accepted"
      : null;
  const nextStatusLabel = nextStatus === "sent" ? "Mark as sent" : "Mark as accepted";
  const sharePath = record.publicToken ? `/proposal/${record.publicToken}` : "";
  const shareUrl = origin && sharePath ? `${origin}${sharePath}` : sharePath;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setCopied(false);
  }, [record.publicEnabled, record.publicToken]);

  async function copyShareLink() {
    if (!record.publicToken) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/proposal/${record.publicToken}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="content-wrap proposal-detail-page">
      <div className="proposal-toolbar print-hidden">
        <button className="secondary-button" onClick={onBack}>← Back to proposals</button>
        <div>
          <button className="secondary-button" onClick={() => window.print()}>Download / Print PDF</button>
          {!record.publicEnabled && <button className="secondary-button" disabled={shareUpdating} onClick={() => void onChangeSharing(true)}>{shareUpdating ? "Creating link…" : "Create share link"}</button>}
          {nextStatus && <button className="primary-button" disabled={updating} onClick={() => void onChangeStatus(nextStatus)}>{updating ? "Updating…" : nextStatusLabel} {!updating && <span>→</span>}</button>}
        </div>
      </div>

      {error && <p className="save-error print-hidden" role="alert">{error}</p>}

      {record.publicEnabled && record.publicToken && (
        <section className="proposal-share-panel print-hidden" aria-label="Public proposal link">
          <div className="proposal-share-status"><span>✓</span><p><strong>Public link is active</strong><small>Anyone with this private link can view the proposal without signing in.</small></p></div>
          <div className="proposal-share-controls">
            <input value={shareUrl} readOnly aria-label="Public proposal link" onFocus={(event) => event.currentTarget.select()} />
            <button className="primary-button" type="button" onClick={() => void copyShareLink()}>{copied ? "Copied!" : "Copy link"}</button>
            <button className="share-revoke-button" type="button" disabled={shareUpdating} onClick={() => void onChangeSharing(false)}>{shareUpdating ? "Updating…" : "Revoke"}</button>
          </div>
        </section>
      )}

      <article className="proposal-paper">
        <header className="proposal-document-header">
          <div className="proposal-document-brand"><span>SG</span><div><strong>ScopeGrade AI</strong><small>Qualify the project. Protect your price.</small></div></div>
          <div className="proposal-document-meta"><span>Proposal</span><strong>{record.proposalNumber}</strong><small>{fullDate(record.createdAt)}</small></div>
        </header>

        <section className="proposal-document-hero">
          <div><span>Project proposal</span><h2>{record.title}</h2><p>Prepared for {record.clientName}</p></div>
          <span className={`proposal-status ${record.status}`}>{statusLabel}</span>
        </section>

        <section className="proposal-parties">
          <div><span>Prepared for</span><strong>{record.clientName}</strong><p>{record.clientEmail ?? "Client email not provided"}</p></div>
          <div><span>Prepared by</span><strong>{ownerName}</strong><p>{ownerEmail}</p></div>
          <div><span>Valid until</span><strong>{expirationDate}</strong><p>14-day proposal window</p></div>
        </section>

        <section className="proposal-document-section">
          <div className="proposal-section-heading"><span>01</span><div><small>Recommended solution</small><h3>{record.packageName ?? "Website"} package</h3></div>{record.grade && <b>Grade {record.grade}</b>}</div>
          <p className="proposal-intro">This proposal reflects the project requirements captured during the ScopeGrade assessment. The investment is tied directly to the approved scope below.</p>
        </section>

        <section className="proposal-document-section">
          <div className="proposal-section-heading"><span>02</span><div><small>Project scope</small><h3>Included deliverables</h3></div></div>
          <ul className="proposal-scope-list">
            {record.scopeItems.length > 0 ? record.scopeItems.map((item) => <li key={item}><span>✓</span>{item}</li>) : <li><span>✓</span>Scope to be confirmed during project kickoff</li>}
          </ul>
          {record.addOns.length > 0 && <div className="proposal-addons"><small>Selected add-ons</small>{record.addOns.map((item) => <p key={item}>+ {item}</p>)}</div>}
        </section>

        <section className="proposal-investment">
          <div><span>Project investment</span><strong>{money(record.value)}</strong><p>Fixed to the scope described above</p></div>
          <div><span>Deposit to begin</span><strong>{money(record.depositAmount)}</strong><p>{record.depositPercentage}% of project investment</p></div>
          <div><span>Ongoing care</span><strong>{record.maintenanceMonthly > 0 ? `${money(record.maintenanceMonthly)}/mo` : "Not included"}</strong><p>{record.maintenanceMonthly > 0 ? "First month included at no charge" : "May be added before launch"}</p></div>
        </section>

        <section className="proposal-document-section proposal-terms">
          <div className="proposal-section-heading"><span>03</span><div><small>Working agreement</small><h3>Next steps and terms</h3></div></div>
          <ol>
            <li><span>1</span><p><strong>Approve the scope</strong><small>Confirm the deliverables, investment and project expectations.</small></p></li>
            <li><span>2</span><p><strong>Pay the deposit</strong><small>The project is scheduled after the deposit is received.</small></p></li>
            <li><span>3</span><p><strong>Begin production</strong><small>Final content, access and project materials are collected at kickoff.</small></p></li>
          </ol>
          <p className="proposal-legal">Requests outside this approved scope may require a separate change order. The remaining project balance is due before final launch or transfer.</p>
        </section>

        <footer className="proposal-document-footer"><span>ScopeGrade AI · Powered by MADEVHUB</span><span>{record.proposalNumber}</span></footer>
      </article>
    </div>
  );
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

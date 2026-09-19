"use client";

import { useEffect, useState } from "react";
import { money } from "../../../lib/pricing";
import { createClient, isSupabaseConfigured } from "../../../utils/supabase/client";
import {
  acceptPublicProposal,
  declinePublicProposal,
  loadPublicProposal,
  type PublicProposalRecord,
  trackPublicProposalView,
} from "../../../utils/supabase/workspace";

type DecisionMode = "idle" | "accepting" | "declining";

function fullDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function PublicProposalView({ token }: { token: string }) {
  const [record, setRecord] = useState<PublicProposalRecord | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(() => (
    isSupabaseConfigured() ? "" : "This proposal could not be opened."
  ));
  const [mode, setMode] = useState<DecisionMode>("idle");
  const [signature, setSignature] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  // Captured once when the proposal loads so the expiry notice cannot flip
  // while the visitor is halfway through accepting.
  const [openedAt, setOpenedAt] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let active = true;
    const supabase = createClient();

    void loadPublicProposal(supabase, token)
      .then((proposal) => {
        if (!active) return;
        setRecord(proposal);
        setOpenedAt(Date.now());
        if (proposal) {
          void trackPublicProposalView(supabase, token).catch(() => undefined);
        }
      })
      .catch(() => {
        if (active) setError("This proposal could not be opened.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <main className="public-proposal-state" aria-live="polite">
        <span className="auth-spinner" />
        <strong>Opening your proposal…</strong>
        <p>Securely loading the project scope and investment.</p>
      </main>
    );
  }

  if (error || !record) {
    return (
      <main className="public-proposal-state public-proposal-error">
        <span>SG</span>
        <strong>Proposal unavailable</strong>
        <p>The link may have been disabled or entered incorrectly. Ask the sender for a new link.</p>
      </main>
    );
  }

  const created = new Date(record.createdAt);
  const fallbackExpiry = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
  const validUntil = record.validUntil
    ? new Date(`${record.validUntil}T23:59:59`)
    : fallbackExpiry;
  const decided = record.status === "accepted" || record.status === "declined";
  const expired = validUntil.getTime() < openedAt && !decided;
  const displayStatus = record.status === "accepted"
    ? "Accepted"
    : record.status === "declined"
      ? "Declined"
      : expired
        ? "Expired"
        : "Proposal ready";
  const displayStatusClass = record.status === "accepted"
    ? "accepted"
    : record.status === "declined"
      ? "declined"
      : expired
        ? "expired"
        : "sent";
  const canDecide = !decided && !expired && (record.status === "sent" || record.status === "viewed");

  async function submitDecision(accepted: boolean) {
    setSubmitting(true);
    setDecisionError("");

    try {
      const supabase = createClient();
      const result = accepted
        ? await acceptPublicProposal(supabase, token, signature)
        : await declinePublicProposal(supabase, token, declineReason);

      if (!result.ok) {
        setDecisionError(
          result.reason === "name_required"
            ? "Please type your full name to sign this approval."
            : "This proposal is no longer open for a decision. Contact the sender for an updated link.",
        );
        return;
      }

      setRecord((current) => current && {
        ...current,
        status: result.status ?? (accepted ? "accepted" : "declined"),
        acceptedAt: result.acceptedAt ?? current.acceptedAt,
        acceptedByName: result.acceptedByName ?? current.acceptedByName,
        declinedAt: result.declinedAt ?? current.declinedAt,
      });
      setMode("idle");
    } catch {
      setDecisionError("The decision could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="public-proposal-shell">
      <header className="public-proposal-topbar print-hidden">
        <div className="public-proposal-brand"><span>SG</span><p><strong>{record.businessName}</strong><small>Secure proposal</small></p></div>
        <div className="public-proposal-actions"><span><i /> Private link</span><button type="button" onClick={() => window.print()}>Download / Print PDF</button></div>
      </header>

      <section className="public-proposal-intro print-hidden">
        <div><span>Prepared for {record.clientName}</span><h1>Your project proposal is ready.</h1><p>Review the recommended solution, included deliverables, investment and next steps below.</p></div>
        <aside><small>Proposal number</small><strong>{record.proposalNumber}</strong><span className={`proposal-status ${displayStatusClass}`}>{displayStatus}</span></aside>
      </section>

      <article className="proposal-paper public-proposal-paper">
        <header className="proposal-document-header">
          <div className="proposal-document-brand"><span>SG</span><div><strong>{record.businessName}</strong><small>Prepared with ScopeGrade AI</small></div></div>
          <div className="proposal-document-meta"><span>Proposal</span><strong>{record.proposalNumber}</strong><small>{fullDate(record.createdAt)}</small></div>
        </header>

        <section className="proposal-document-hero">
          <div><span>Project proposal</span><h2>{record.title}</h2><p>Prepared for {record.clientName}</p></div>
          <span className={`proposal-status ${displayStatusClass}`}>{displayStatus}</span>
        </section>

        <section className="proposal-parties">
          <div><span>Prepared for</span><strong>{record.clientName}</strong><p>{record.clientEmail ?? "Client contact"}</p></div>
          <div><span>Prepared by</span><strong>{record.ownerName}</strong><p>{record.ownerEmail ?? record.businessName}</p></div>
          <div><span>Valid until</span><strong>{fullDate(validUntil.toISOString())}</strong><p>{expired ? "This proposal has expired" : "Proposal acceptance window"}</p></div>
        </section>

        {record.clientMessage && <section className="public-proposal-message"><span>Message from {record.ownerName}</span><p>{record.clientMessage}</p></section>}

        <section className="proposal-document-section">
          <div className="proposal-section-heading"><span>01</span><div><small>Recommended solution</small><h3>{record.packageName ?? "Website"} package</h3></div>{record.grade && <b>Grade {record.grade}</b>}</div>
          <p className="proposal-intro">This proposal reflects the project requirements captured during the ScopeGrade assessment. The investment is tied directly to the approved scope below.</p>
        </section>

        <section className="proposal-document-section">
          <div className="proposal-section-heading"><span>02</span><div><small>Project scope</small><h3>Included deliverables</h3></div></div>
          <ul className="proposal-scope-list">
            {record.scopeItems.length > 0
              ? record.scopeItems.map((item) => <li key={item}><span>✓</span>{item}</li>)
              : <li><span>✓</span>Scope to be confirmed during project kickoff</li>}
          </ul>
          {record.addOns.length > 0 && <div className="proposal-addons"><small>Selected add-ons</small>{record.addOns.map((item) => <p key={item}>+ {item}</p>)}</div>}
        </section>

        <section className="proposal-investment">
          <div><span>Project investment</span><strong>{money(record.value, record.currency)}</strong><p>Fixed to the scope described above</p></div>
          <div><span>Deposit to begin</span><strong>{money(record.depositAmount, record.currency)}</strong><p>{record.depositPercentage}% of project investment</p></div>
          <div><span>Ongoing care</span><strong>{record.maintenanceMonthly > 0 ? `${money(record.maintenanceMonthly, record.currency)}/mo` : "Not included"}</strong><p>{record.maintenanceMonthly > 0 ? "First month included at no charge" : "May be added before launch"}</p></div>
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

        <footer className="proposal-document-footer"><span>{record.acceptedByName ? `Accepted by ${record.acceptedByName}` : "Prepared securely with ScopeGrade AI"}</span><span>{record.proposalNumber}</span></footer>
      </article>

      <section className="public-decision print-hidden" aria-live="polite">
        {record.status === "accepted" && (
          <div className="public-decision-result accepted">
            <span>✓</span>
            <div>
              <strong>Proposal accepted</strong>
              <p>
                Thank you{record.acceptedByName ? `, ${record.acceptedByName}` : ""}. {record.ownerName} has been notified and will follow up with the deposit of {money(record.depositAmount, record.currency)} and the kickoff details.
              </p>
            </div>
          </div>
        )}

        {record.status === "declined" && (
          <div className="public-decision-result declined">
            <span>·</span>
            <div>
              <strong>Proposal declined</strong>
              <p>Your response was recorded. If this was a mistake, contact {record.ownerName} and they can reissue the proposal.</p>
            </div>
          </div>
        )}

        {expired && !decided && (
          <div className="public-decision-result expired">
            <span>◷</span>
            <div>
              <strong>This proposal has expired</strong>
              <p>The acceptance window closed on {fullDate(validUntil.toISOString())}. Ask {record.ownerName} for an updated proposal.</p>
            </div>
          </div>
        )}

        {canDecide && mode === "idle" && (
          <div className="public-decision-prompt">
            <div>
              <span>Ready to start?</span>
              <strong>Approve this scope and {record.ownerName.split(" ")[0]} will schedule your project.</strong>
              <small>Accepting confirms the deliverables and the investment of {money(record.value, record.currency)}.</small>
            </div>
            <div className="public-decision-buttons">
              <button type="button" className="primary-button" onClick={() => { setMode("accepting"); setDecisionError(""); }}>Accept proposal <span>→</span></button>
              <button type="button" className="text-button" onClick={() => { setMode("declining"); setDecisionError(""); }}>Decline</button>
            </div>
          </div>
        )}

        {canDecide && mode === "accepting" && (
          <form className="public-decision-form" onSubmit={(event) => { event.preventDefault(); void submitDecision(true); }}>
            <span>Digital approval</span>
            <strong>Type your full name to accept this proposal.</strong>
            <label>
              <span>Full name</span>
              <input value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Your full name" autoComplete="name" required minLength={2} />
            </label>
            <p className="public-decision-legal">By accepting you confirm the scope and the investment of {money(record.value, record.currency)}, with a deposit of {money(record.depositAmount, record.currency)} to begin.</p>
            {decisionError && <p className="auth-alert error" role="alert">{decisionError}</p>}
            <div className="public-decision-buttons">
              <button type="submit" className="primary-button" disabled={submitting || signature.trim().length < 2}>{submitting ? "Recording…" : "Confirm acceptance"} {!submitting && <span>→</span>}</button>
              <button type="button" className="text-button" disabled={submitting} onClick={() => setMode("idle")}>Cancel</button>
            </div>
          </form>
        )}

        {canDecide && mode === "declining" && (
          <form className="public-decision-form" onSubmit={(event) => { event.preventDefault(); void submitDecision(false); }}>
            <span>Not this time</span>
            <strong>Let {record.ownerName.split(" ")[0]} know why, so they can adjust the offer.</strong>
            <label>
              <span>Reason <em>Optional</em></span>
              <textarea value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} placeholder="Budget, timing, scope…" maxLength={500} />
            </label>
            {decisionError && <p className="auth-alert error" role="alert">{decisionError}</p>}
            <div className="public-decision-buttons">
              <button type="submit" className="secondary-button" disabled={submitting}>{submitting ? "Sending…" : "Send decline"}</button>
              <button type="button" className="text-button" disabled={submitting} onClick={() => setMode("idle")}>Back</button>
            </div>
          </form>
        )}
      </section>

      <section className="public-proposal-contact print-hidden">
        <div><span>Questions about this proposal?</span><strong>Contact {record.ownerName}</strong></div>
        {record.ownerEmail && <a href={`mailto:${record.ownerEmail}?subject=${encodeURIComponent(`Question about proposal ${record.proposalNumber}`)}`}>Email {record.ownerName.split(" ")[0]} <span>→</span></a>}
      </section>
    </main>
  );
}

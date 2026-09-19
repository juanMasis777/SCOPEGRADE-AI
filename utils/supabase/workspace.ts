import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type Assessment,
  DEFAULT_DEPOSIT_PERCENTAGE,
  CARE_PLAN_MONTHLY,
  defaultValidUntil,
  depositAmount,
  type Grade,
  type PackageName,
  type ProjectInput,
} from "../../lib/pricing";

export type { Assessment, ProjectInput };

export type ProposalStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired";

export type ProfileRecord = {
  id: string;
  email: string | null;
  fullName: string | null;
  businessName: string | null;
};

export type ProfileUpdateInput = {
  fullName: string;
  businessName: string;
};

export type AssessmentRecord = {
  id: string;
  clientId: string | null;
  clientName: string;
  projectName: string;
  packageName: PackageName;
  price: number;
  grade: Grade;
  createdAt: string;
};

export type ProposalRecord = {
  id: string;
  clientId: string | null;
  clientName: string;
  clientEmail: string | null;
  title: string;
  proposalNumber: string;
  status: ProposalStatus;
  value: number;
  maintenanceMonthly: number;
  depositPercentage: number;
  depositAmount: number;
  scopeItems: string[];
  addOns: string[];
  clientMessage: string | null;
  validUntil: string | null;
  packageName: PackageName | null;
  grade: Grade | null;
  publicToken: string | null;
  publicEnabled: boolean;
  sharedAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  acceptedByName: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  createdAt: string;
};

/** Fields the owner can change on a saved proposal before or after sharing it. */
export type ProposalEditInput = {
  title: string;
  value: number;
  depositPercentage: number;
  maintenanceMonthly: number;
  validUntil: string;
  clientMessage: string;
  scopeItems: string[];
  addOns: string[];
};

export type PublicProposalRecord = {
  proposalNumber: string;
  title: string;
  status: ProposalStatus;
  currency: string;
  value: number;
  maintenanceMonthly: number;
  depositPercentage: number;
  depositAmount: number;
  scopeItems: string[];
  addOns: string[];
  clientMessage: string | null;
  validUntil: string | null;
  clientName: string;
  clientEmail: string | null;
  ownerName: string;
  ownerEmail: string | null;
  businessName: string;
  packageName: PackageName | null;
  grade: Grade | null;
  acceptedAt: string | null;
  acceptedByName: string | null;
  declinedAt: string | null;
  createdAt: string;
};

export type ClientRecord = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
};

export type ClientUpdateInput = {
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
};

const PROPOSAL_SELECT =
  "id, client_id, proposal_number, title, status, subtotal, maintenance_monthly, deposit_percentage, deposit_amount, scope_items, add_ons, client_message, valid_until, public_token, public_enabled, shared_at, viewed_at, accepted_at, accepted_by_name, declined_at, decline_reason, created_at, clients(name, email), assessments(package_name, grade)";

const CLIENT_SELECT = "id, name, company, email, phone, notes, created_at";

type ClientRelation = { name: string; email?: string | null } | Array<{ name: string; email?: string | null }> | null;
type AssessmentRelation = { package_name: string; grade: string } | Array<{ package_name: string; grade: string }> | null;

function relatedClient(relation: ClientRelation) {
  const client = Array.isArray(relation) ? relation[0] : relation;
  return { name: client?.name ?? "Client", email: client?.email ?? null };
}

function relatedAssessment(relation: AssessmentRelation) {
  const assessment = Array.isArray(relation) ? relation[0] : relation;
  return {
    packageName: (assessment?.package_name ?? null) as PackageName | null,
    grade: (assessment?.grade ?? null) as Grade | null,
  };
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function mapClient(row: Record<string, never> | { [key: string]: unknown }): ClientRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    company: (row.company as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapProposal(row: { [key: string]: unknown }): ProposalRecord {
  const client = relatedClient(row.clients as ClientRelation);
  const assessment = relatedAssessment(row.assessments as AssessmentRelation);
  return {
    id: String(row.id),
    clientId: (row.client_id as string | null) ?? null,
    clientName: client.name,
    clientEmail: client.email,
    title: String(row.title),
    proposalNumber: String(row.proposal_number),
    status: row.status as ProposalStatus,
    value: Number(row.subtotal),
    maintenanceMonthly: Number(row.maintenance_monthly),
    depositPercentage: Number(row.deposit_percentage),
    depositAmount: Number(row.deposit_amount),
    scopeItems: strings(row.scope_items),
    addOns: strings(row.add_ons),
    clientMessage: (row.client_message as string | null) ?? null,
    validUntil: (row.valid_until as string | null) ?? null,
    packageName: assessment.packageName,
    grade: assessment.grade,
    publicToken: (row.public_token as string | null) ?? null,
    publicEnabled: Boolean(row.public_enabled),
    sharedAt: (row.shared_at as string | null) ?? null,
    viewedAt: (row.viewed_at as string | null) ?? null,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    acceptedByName: (row.accepted_by_name as string | null) ?? null,
    declinedAt: (row.declined_at as string | null) ?? null,
    declineReason: (row.decline_reason as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export async function loadWorkspaceData(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<{
  clients: ClientRecord[];
  assessments: AssessmentRecord[];
  proposals: ProposalRecord[];
  profile: ProfileRecord | null;
}> {
  const [clientResult, assessmentResult, proposalResult, profileResult] = await Promise.all([
    supabase
      .from("clients")
      .select(CLIENT_SELECT)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("assessments")
      .select("id, client_id, project_name, package_name, recommended_price, grade, created_at, clients(name)")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("proposals")
      .select(PROPOSAL_SELECT)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select("id, email, full_name, business_name")
      .eq("id", ownerId)
      .maybeSingle(),
  ]);

  if (clientResult.error) throw clientResult.error;
  if (assessmentResult.error) throw assessmentResult.error;
  if (proposalResult.error) throw proposalResult.error;
  if (profileResult.error) throw profileResult.error;

  return {
    clients: (clientResult.data ?? []).map(mapClient),
    assessments: (assessmentResult.data ?? []).map((row) => {
      const client = relatedClient(row.clients as ClientRelation);
      return {
        id: row.id,
        clientId: row.client_id,
        clientName: client.name,
        projectName: row.project_name,
        packageName: row.package_name as PackageName,
        price: Number(row.recommended_price),
        grade: row.grade as Grade,
        createdAt: row.created_at,
      };
    }),
    proposals: (proposalResult.data ?? []).map(mapProposal),
    profile: profileResult.data
      ? {
          id: profileResult.data.id,
          email: profileResult.data.email,
          fullName: profileResult.data.full_name,
          businessName: profileResult.data.business_name,
        }
      : null,
  };
}

export async function updateProfile(
  supabase: SupabaseClient,
  ownerId: string,
  email: string | null,
  input: ProfileUpdateInput,
): Promise<ProfileRecord> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: ownerId,
        email,
        full_name: input.fullName.trim() || null,
        business_name: input.businessName.trim() || null,
      },
      { onConflict: "id" },
    )
    .select("id, email, full_name, business_name")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    businessName: data.business_name,
  };
}

export async function updateClientDetails(
  supabase: SupabaseClient,
  ownerId: string,
  clientId: string,
  input: ClientUpdateInput,
): Promise<ClientRecord> {
  const { data, error } = await supabase
    .from("clients")
    .update({
      name: input.name.trim(),
      company: input.company.trim() || null,
      email: input.email.trim().toLowerCase() || null,
      phone: input.phone.trim() || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", clientId)
    .eq("owner_id", ownerId)
    .select(CLIENT_SELECT)
    .single();

  if (error) throw error;

  return mapClient(data);
}

export async function deleteClient(
  supabase: SupabaseClient,
  ownerId: string,
  clientId: string,
) {
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId)
    .eq("owner_id", ownerId);

  if (error) throw error;
}

export async function updateProposalStatus(
  supabase: SupabaseClient,
  ownerId: string,
  proposalId: string,
  status: ProposalStatus,
) {
  const timestampUpdates = status === "sent"
    ? { sent_at: new Date().toISOString() }
    : status === "accepted"
      ? { accepted_at: new Date().toISOString() }
      : {};

  const { error } = await supabase
    .from("proposals")
    .update({ status, ...timestampUpdates })
    .eq("id", proposalId)
    .eq("owner_id", ownerId);

  if (error) throw error;
}

export async function updateProposalDetails(
  supabase: SupabaseClient,
  ownerId: string,
  proposalId: string,
  input: ProposalEditInput,
): Promise<ProposalRecord> {
  const value = Math.max(0, Math.round(input.value * 100) / 100);
  const percentage = Math.min(100, Math.max(0, Math.round(input.depositPercentage)));

  const { data, error } = await supabase
    .from("proposals")
    .update({
      title: input.title.trim() || "Project proposal",
      subtotal: value,
      deposit_percentage: percentage,
      deposit_amount: depositAmount(value, percentage),
      maintenance_monthly: Math.max(0, Math.round(input.maintenanceMonthly * 100) / 100),
      valid_until: input.validUntil || null,
      client_message: input.clientMessage.trim() || null,
      scope_items: input.scopeItems,
      add_ons: input.addOns,
    })
    .eq("id", proposalId)
    .eq("owner_id", ownerId)
    .select(PROPOSAL_SELECT)
    .single();

  if (error) throw error;

  return mapProposal(data);
}

export async function deleteProposal(
  supabase: SupabaseClient,
  ownerId: string,
  proposalId: string,
) {
  const { error } = await supabase
    .from("proposals")
    .delete()
    .eq("id", proposalId)
    .eq("owner_id", ownerId);

  if (error) throw error;
}

export async function setProposalSharing(
  supabase: SupabaseClient,
  ownerId: string,
  proposalId: string,
  currentStatus: ProposalStatus,
  enabled: boolean,
) {
  const now = new Date().toISOString();
  const updates = enabled
    ? {
        public_enabled: true,
        public_token: crypto.randomUUID(),
        shared_at: now,
        ...(currentStatus === "draft" ? { status: "sent", sent_at: now } : {}),
      }
    : { public_enabled: false };

  const { data, error } = await supabase
    .from("proposals")
    .update(updates)
    .eq("id", proposalId)
    .eq("owner_id", ownerId)
    .select("public_token, public_enabled, shared_at, status")
    .single();

  if (error) throw error;

  return {
    publicToken: data.public_token as string,
    publicEnabled: Boolean(data.public_enabled),
    sharedAt: data.shared_at as string | null,
    status: data.status as ProposalStatus,
  };
}

export async function loadPublicProposal(
  supabase: SupabaseClient,
  token: string,
): Promise<PublicProposalRecord | null> {
  const { data, error } = await supabase.rpc("get_public_proposal", { p_token: token });

  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const row = data as Record<string, unknown>;
  return {
    proposalNumber: String(row.proposal_number ?? ""),
    title: String(row.title ?? "Project proposal"),
    status: String(row.status ?? "sent") as ProposalStatus,
    currency: String(row.currency ?? "USD"),
    value: Number(row.subtotal ?? 0),
    maintenanceMonthly: Number(row.maintenance_monthly ?? 0),
    depositPercentage: Number(row.deposit_percentage ?? 0),
    depositAmount: Number(row.deposit_amount ?? 0),
    scopeItems: strings(row.scope_items),
    addOns: strings(row.add_ons),
    clientMessage: typeof row.client_message === "string" ? row.client_message : null,
    validUntil: typeof row.valid_until === "string" ? row.valid_until : null,
    clientName: String(row.client_name ?? "Client"),
    clientEmail: typeof row.client_email === "string" ? row.client_email : null,
    ownerName: String(row.owner_name ?? row.business_name ?? "ScopeGrade team"),
    ownerEmail: typeof row.owner_email === "string" ? row.owner_email : null,
    businessName: String(row.business_name ?? "ScopeGrade AI"),
    packageName: (row.package_name ?? null) as PackageName | null,
    grade: (row.grade ?? null) as Grade | null,
    acceptedAt: typeof row.accepted_at === "string" ? row.accepted_at : null,
    acceptedByName: typeof row.accepted_by_name === "string" ? row.accepted_by_name : null,
    declinedAt: typeof row.declined_at === "string" ? row.declined_at : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function trackPublicProposalView(supabase: SupabaseClient, token: string) {
  const { error } = await supabase.rpc("track_public_proposal_view", { p_token: token });
  if (error) throw error;
}

export type PublicDecisionResult = {
  ok: boolean;
  reason: string | null;
  status: ProposalStatus | null;
  acceptedAt: string | null;
  acceptedByName: string | null;
  declinedAt: string | null;
};

function readDecision(data: unknown): PublicDecisionResult {
  const row = (data && typeof data === "object" && !Array.isArray(data) ? data : {}) as Record<string, unknown>;
  return {
    ok: Boolean(row.ok),
    reason: typeof row.reason === "string" ? row.reason : null,
    status: typeof row.status === "string" ? (row.status as ProposalStatus) : null,
    acceptedAt: typeof row.accepted_at === "string" ? row.accepted_at : null,
    acceptedByName: typeof row.accepted_by_name === "string" ? row.accepted_by_name : null,
    declinedAt: typeof row.declined_at === "string" ? row.declined_at : null,
  };
}

/** Records the client's acceptance from the private proposal link. */
export async function acceptPublicProposal(
  supabase: SupabaseClient,
  token: string,
  name: string,
): Promise<PublicDecisionResult> {
  const { data, error } = await supabase.rpc("accept_public_proposal", {
    p_token: token,
    p_name: name.trim(),
  });

  if (error) throw error;
  return readDecision(data);
}

/** Records the client's decline, with an optional reason for the owner. */
export async function declinePublicProposal(
  supabase: SupabaseClient,
  token: string,
  reason: string,
): Promise<PublicDecisionResult> {
  const { data, error } = await supabase.rpc("decline_public_proposal", {
    p_token: token,
    p_reason: reason.trim(),
  });

  if (error) throw error;
  return readDecision(data);
}

export async function saveAssessmentAndProposal(
  supabase: SupabaseClient,
  ownerId: string,
  form: ProjectInput,
  assessment: Assessment,
) {
  const normalizedEmail = form.clientEmail.trim().toLowerCase();
  let clientId: string | null = null;

  if (normalizedEmail) {
    const { data: existingClient, error: lookupError } = await supabase
      .from("clients")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupError) throw lookupError;
    clientId = existingClient?.id ?? null;
  }

  if (clientId) {
    const { error: updateError } = await supabase
      .from("clients")
      .update({ name: form.clientName.trim(), notes: form.notes.trim() || null })
      .eq("id", clientId)
      .eq("owner_id", ownerId);

    if (updateError) throw updateError;
  } else {
    const { data: createdClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        owner_id: ownerId,
        name: form.clientName.trim(),
        email: normalizedEmail || null,
        notes: form.notes.trim() || null,
      })
      .select("id")
      .single();

    if (clientError) throw clientError;
    clientId = createdClient.id;
  }

  const { data: createdAssessment, error: assessmentError } = await supabase
    .from("assessments")
    .insert({
      owner_id: ownerId,
      client_id: clientId,
      project_name: form.projectName.trim(),
      project_type: form.projectType,
      pages: form.pages,
      sections: form.sections,
      content_ready: form.contentReady,
      bilingual: form.bilingual,
      booking: form.booking,
      payments: form.payments,
      client_login: form.clientLogin,
      custom_design: form.customDesign,
      rush: form.rush,
      maintenance: form.maintenance,
      notes: form.notes.trim() || null,
      package_name: assessment.packageName,
      grade: assessment.grade,
      recommended_price: assessment.price,
      price_range: assessment.range,
      complexity_score: assessment.score,
      reasons: assessment.reasons,
      included_items: assessment.included,
      extras: assessment.extras,
      status: "completed",
    })
    .select("id")
    .single();

  if (assessmentError) throw assessmentError;

  const proposalNumber = `SG-${Date.now().toString(36).toUpperCase()}`;
  const { data: createdProposal, error: proposalError } = await supabase
    .from("proposals")
    .insert({
      owner_id: ownerId,
      client_id: clientId,
      assessment_id: createdAssessment.id,
      proposal_number: proposalNumber,
      title: form.projectName.trim() || "Project proposal",
      status: "draft",
      subtotal: assessment.price,
      maintenance_monthly: form.maintenance ? CARE_PLAN_MONTHLY : 0,
      deposit_percentage: DEFAULT_DEPOSIT_PERCENTAGE,
      deposit_amount: depositAmount(assessment.price, DEFAULT_DEPOSIT_PERCENTAGE),
      scope_items: assessment.included,
      add_ons: assessment.extras,
      valid_until: defaultValidUntil(),
    })
    .select("id")
    .single();

  if (proposalError) throw proposalError;

  return {
    clientId,
    assessmentId: createdAssessment.id,
    proposalId: createdProposal.id,
  };
}

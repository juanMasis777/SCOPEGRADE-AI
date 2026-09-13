import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectFormInput = {
  projectName: string;
  clientName: string;
  clientEmail: string;
  projectType: "landing" | "business" | "ecommerce" | "webapp";
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

export type AssessmentInput = {
  packageName: "Promotional" | "Professional" | "Custom";
  grade: "A" | "B" | "C";
  price: number;
  range: string;
  score: number;
  reasons: string[];
  included: string[];
  extras: string[];
};

export type AssessmentRecord = {
  id: string;
  clientId: string | null;
  clientName: string;
  projectName: string;
  packageName: "Promotional" | "Professional" | "Custom";
  price: number;
  grade: "A" | "B" | "C";
  createdAt: string;
};

export type ProposalRecord = {
  id: string;
  clientId: string | null;
  clientName: string;
  clientEmail: string | null;
  title: string;
  proposalNumber: string;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";
  value: number;
  maintenanceMonthly: number;
  depositPercentage: number;
  depositAmount: number;
  scopeItems: string[];
  addOns: string[];
  clientMessage: string | null;
  validUntil: string | null;
  packageName: "Promotional" | "Professional" | "Custom" | null;
  grade: "A" | "B" | "C" | null;
  publicToken: string | null;
  publicEnabled: boolean;
  sharedAt: string | null;
  viewedAt: string | null;
  createdAt: string;
};

export type PublicProposalRecord = {
  proposalNumber: string;
  title: string;
  status: ProposalRecord["status"];
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
  packageName: ProposalRecord["packageName"];
  grade: ProposalRecord["grade"];
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

type ClientRelation = { name: string; email?: string | null } | Array<{ name: string; email?: string | null }> | null;
type AssessmentRelation = { package_name: string; grade: string } | Array<{ package_name: string; grade: string }> | null;

function relatedClient(relation: ClientRelation) {
  const client = Array.isArray(relation) ? relation[0] : relation;
  return { name: client?.name ?? "Client", email: client?.email ?? null };
}

function relatedAssessment(relation: AssessmentRelation) {
  const assessment = Array.isArray(relation) ? relation[0] : relation;
  return {
    packageName: (assessment?.package_name ?? null) as ProposalRecord["packageName"],
    grade: (assessment?.grade ?? null) as ProposalRecord["grade"],
  };
}

export async function loadWorkspaceData(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<{ clients: ClientRecord[]; assessments: AssessmentRecord[]; proposals: ProposalRecord[] }> {
  const [clientResult, assessmentResult, proposalResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, company, email, phone, notes, created_at")
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
      .select("id, client_id, proposal_number, title, status, subtotal, maintenance_monthly, deposit_percentage, deposit_amount, scope_items, add_ons, client_message, valid_until, public_token, public_enabled, shared_at, viewed_at, created_at, clients(name, email), assessments(package_name, grade)")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (clientResult.error) throw clientResult.error;
  if (assessmentResult.error) throw assessmentResult.error;
  if (proposalResult.error) throw proposalResult.error;

  return {
    clients: (clientResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      company: row.company,
      email: row.email,
      phone: row.phone,
      notes: row.notes,
      createdAt: row.created_at,
    })),
    assessments: (assessmentResult.data ?? []).map((row) => {
      const client = relatedClient(row.clients as ClientRelation);
      return {
        id: row.id,
        clientId: row.client_id,
        clientName: client.name,
        projectName: row.project_name,
        packageName: row.package_name as AssessmentRecord["packageName"],
        price: Number(row.recommended_price),
        grade: row.grade as AssessmentRecord["grade"],
        createdAt: row.created_at,
      };
    }),
    proposals: (proposalResult.data ?? []).map((row) => {
      const client = relatedClient(row.clients as ClientRelation);
      const assessment = relatedAssessment(row.assessments as AssessmentRelation);
      return {
        id: row.id,
        clientId: row.client_id,
        clientName: client.name,
        clientEmail: client.email,
        title: row.title,
        proposalNumber: row.proposal_number,
        status: row.status as ProposalRecord["status"],
        value: Number(row.subtotal),
        maintenanceMonthly: Number(row.maintenance_monthly),
        depositPercentage: Number(row.deposit_percentage),
        depositAmount: Number(row.deposit_amount),
        scopeItems: Array.isArray(row.scope_items) ? row.scope_items.map(String) : [],
        addOns: Array.isArray(row.add_ons) ? row.add_ons.map(String) : [],
        clientMessage: row.client_message,
        validUntil: row.valid_until,
        packageName: assessment.packageName,
        grade: assessment.grade,
        publicToken: row.public_token,
        publicEnabled: Boolean(row.public_enabled),
        sharedAt: row.shared_at,
        viewedAt: row.viewed_at,
        createdAt: row.created_at,
      };
    }),
  };
}

export async function updateClientDetails(
  supabase: SupabaseClient,
  ownerId: string,
  clientId: string,
  input: ClientUpdateInput,
) {
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
    .select("id, name, company, email, phone, notes, created_at")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.phone,
    notes: data.notes,
    createdAt: data.created_at,
  } satisfies ClientRecord;
}

export async function updateProposalStatus(
  supabase: SupabaseClient,
  ownerId: string,
  proposalId: string,
  status: ProposalRecord["status"],
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

export async function setProposalSharing(
  supabase: SupabaseClient,
  ownerId: string,
  proposalId: string,
  currentStatus: ProposalRecord["status"],
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
    status: data.status as ProposalRecord["status"],
  };
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
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
    status: String(row.status ?? "sent") as ProposalRecord["status"],
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
    packageName: (row.package_name ?? null) as ProposalRecord["packageName"],
    grade: (row.grade ?? null) as ProposalRecord["grade"],
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function trackPublicProposalView(supabase: SupabaseClient, token: string) {
  const { error } = await supabase.rpc("track_public_proposal_view", { p_token: token });
  if (error) throw error;
}

export async function saveAssessmentAndProposal(
  supabase: SupabaseClient,
  ownerId: string,
  form: ProjectFormInput,
  assessment: AssessmentInput,
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
  const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data: createdProposal, error: proposalError } = await supabase
    .from("proposals")
    .insert({
      owner_id: ownerId,
      client_id: clientId,
      assessment_id: createdAssessment.id,
      proposal_number: proposalNumber,
      title: form.projectName.trim(),
      status: "draft",
      subtotal: assessment.price,
      maintenance_monthly: form.maintenance ? 97 : 0,
      deposit_percentage: 50,
      deposit_amount: Math.round(assessment.price * 50) / 100,
      scope_items: assessment.included,
      add_ons: assessment.extras,
      valid_until: validUntil,
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

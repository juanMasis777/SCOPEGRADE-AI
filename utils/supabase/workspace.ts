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
  clientName: string;
  projectName: string;
  packageName: "Promotional" | "Professional" | "Custom";
  price: number;
  grade: "A" | "B" | "C";
  createdAt: string;
};

export type ProposalRecord = {
  id: string;
  clientName: string;
  title: string;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";
  value: number;
  createdAt: string;
};

type ClientRelation = { name: string } | Array<{ name: string }> | null;

function relatedClientName(relation: ClientRelation) {
  if (Array.isArray(relation)) return relation[0]?.name ?? "Client";
  return relation?.name ?? "Client";
}

export async function loadWorkspaceData(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<{ assessments: AssessmentRecord[]; proposals: ProposalRecord[] }> {
  const [assessmentResult, proposalResult] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, project_name, package_name, recommended_price, grade, created_at, clients(name)")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("proposals")
      .select("id, title, status, subtotal, created_at, clients(name)")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (assessmentResult.error) throw assessmentResult.error;
  if (proposalResult.error) throw proposalResult.error;

  return {
    assessments: (assessmentResult.data ?? []).map((row) => ({
      id: row.id,
      clientName: relatedClientName(row.clients as ClientRelation),
      projectName: row.project_name,
      packageName: row.package_name as AssessmentRecord["packageName"],
      price: Number(row.recommended_price),
      grade: row.grade as AssessmentRecord["grade"],
      createdAt: row.created_at,
    })),
    proposals: (proposalResult.data ?? []).map((row) => ({
      id: row.id,
      clientName: relatedClientName(row.clients as ClientRelation),
      title: row.title,
      status: row.status as ProposalRecord["status"],
      value: Number(row.subtotal),
      createdAt: row.created_at,
    })),
  };
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

import PublicProposalView from "./public-proposal-view";

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicProposalView token={token} />;
}

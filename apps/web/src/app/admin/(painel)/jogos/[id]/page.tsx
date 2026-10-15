import { notFound } from "next/navigation";
import { MatchReview } from "@/components/MatchReview";
import { ApiError, api } from "@/lib/api";
import type { MatchDetail } from "@/lib/types";

export default async function AdminMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const match = await api<MatchDetail>(`/matches/${id}`);
    return <MatchReview match={match} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

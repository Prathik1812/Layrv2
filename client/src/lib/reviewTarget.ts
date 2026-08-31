export type ReviewGapLink = { linkedEntityType: string; linkedEntityId: number | null };

export function getReviewTarget(projectId: number, gap: ReviewGapLink) {
  const stage = gap.linkedEntityType === "ia_node" ? "ia" : "flows";
  const highlight = gap.linkedEntityId ? `?highlight=${gap.linkedEntityId}` : "";
  return `/projects/${projectId}/${stage}${highlight}`;
}

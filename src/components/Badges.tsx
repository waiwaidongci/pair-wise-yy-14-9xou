import type { VersionStatus } from "../domain/types";

const STATUS_TEXT: Record<VersionStatus, string> = {
  valid: "有效放行",
  pending: "待复核冲突",
  superseded: "已替代",
  rejected: "复核驳回",
};

export function StatusBadge({ status }: { status: VersionStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_TEXT[status]}</span>;
}

export function ConflictBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="conflict-flag">⚠ 待复核冲突</span>;
}

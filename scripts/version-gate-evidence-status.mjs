export function applyEvidenceAudit(versionStatus, auditStatus) {
  if (auditStatus === "FAIL" || versionStatus === "FAIL") return "FAIL";
  if (auditStatus === "INCOMPLETE" && versionStatus === "PASS") return "INCOMPLETE";
  return versionStatus;
}

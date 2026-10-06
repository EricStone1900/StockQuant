import type { Pool } from "pg";
import type { CandidateRegistration } from "../domain/candidate-registration.js";
import type { CandidateRegistrationRepository, CandidateRegistrationRecord } from "../ports/candidate-registration-repository.js";

type CandidateRow = {
  candidate_id: string;
  qlib_version: string;
  algorithm: string;
  artifact_hash: string;
  approved_by: string;
  status: "CANDIDATE_APPROVED";
  activation: "DISABLED_UNTIL_MANDATE";
  created_at: Date;
};

const toRecord = (row: CandidateRow): CandidateRegistrationRecord => ({
  candidateId: row.candidate_id,
  qlibVersion: row.qlib_version,
  algorithm: row.algorithm,
  artifactHash: row.artifact_hash.trim(),
  approvedBy: row.approved_by,
  status: row.status,
  activation: row.activation,
  createdAt: row.created_at,
});

export class PostgresCandidateRegistrationRepository implements CandidateRegistrationRepository {
  constructor(private readonly pool: Pool) {}

  async create(registration: CandidateRegistration): Promise<CandidateRegistrationRecord | null> {
    const result = await this.pool.query<CandidateRow>(`INSERT INTO research_candidates
      (candidate_id, qlib_version, algorithm, artifact_hash, approved_by, status, activation)
      VALUES ($1,$2,$3,$4,$5,'CANDIDATE_APPROVED','DISABLED_UNTIL_MANDATE')
      ON CONFLICT (candidate_id) DO NOTHING RETURNING *`,
    [registration.candidateId, registration.qlibVersion, registration.algorithm, registration.artifactHash, registration.approvedBy]);
    return result.rows[0] ? toRecord(result.rows[0]) : null;
  }

  async find(candidateId: string): Promise<CandidateRegistrationRecord | null> {
    const result = await this.pool.query<CandidateRow>("SELECT * FROM research_candidates WHERE candidate_id=$1", [candidateId]);
    return result.rows[0] ? toRecord(result.rows[0]) : null;
  }
}

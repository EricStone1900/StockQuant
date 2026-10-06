import type { CandidateRegistration } from "../domain/candidate-registration.js";

export interface CandidateRegistrationRecord extends CandidateRegistration {
  status: "CANDIDATE_APPROVED";
  activation: "DISABLED_UNTIL_MANDATE";
  createdAt: Date;
}

export interface CandidateRegistrationRepository {
  create(registration: CandidateRegistration): Promise<CandidateRegistrationRecord | null>;
  find(candidateId: string): Promise<CandidateRegistrationRecord | null>;
}

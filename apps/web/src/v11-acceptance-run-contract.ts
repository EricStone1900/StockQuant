import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../../../packages/contracts/schemas/common/v11-acceptance-run.schema.json";
import type { V11AcceptanceRun } from "../../../packages/contracts/generated/types.js";

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile<V11AcceptanceRun>(schema);

export function parseV11AcceptanceRun(value: unknown): V11AcceptanceRun {
  if (!validate(value)) {
    throw new Error(`Invalid V1.1 acceptance run response: ${ajv.errorsText(validate.errors)}`);
  }
  return value;
}

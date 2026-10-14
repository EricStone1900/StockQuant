import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schema = JSON.parse(readFileSync(new URL('../packages/contracts/research/v14-daily-backtest-result.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const expectedModels = {
  normal: 'DAILY_BAR_CLOSE_NEXT_SESSION_PARTICIPATION_V1',
  rejection: 'DAILY_BAR_CLOSE_NEXT_SESSION_PARTICIPATION_V1',
  recovery: 'DAILY_BAR_CLOSE_NEXT_SESSION_PARTICIPATION_V1',
  'historical-fees': 'DAILY_BAR_CLOSE_NEXT_SESSION_PARTICIPATION_V1',
  'market-restrictions': 'SYNTHETIC_DAILY_OHLC_RESTRICTION_RULES_V1',
  'corporate-actions': 'RAW_DAILY_BAR_CORPORATE_ACTION_LEDGER_V1',
};

function result(scenarioId, modelId) {
  return {
    testRunId: '08e95ffe-1560-4684-bbed-7a4e673af5b4',
    stageId: 'V1.4', scenarioId, seed: 20260907, status: 'COMPLETED', assertions: [],
    evidence: { executionModel: { component: 'QUANT_BACKTEST_ENGINE', modelId } },
    durableReport: { resultSha256: 'a'.repeat(64), manifestSha256: 'b'.repeat(64) },
  };
}

test('V1.4 result contract accepts the execution model assigned to every scenario', () => {
  for (const [scenario, model] of Object.entries(expectedModels)) {
    assert.equal(validate(result(scenario, model)), true, `${scenario}: ${ajv.errorsText(validate.errors)}`);
  }
});

test('V1.4 result contract rejects an execution model mislabeled for its scenario', () => {
  for (const [scenario, model] of Object.entries(expectedModels)) {
    for (const wrongModel of Object.values(expectedModels).filter((candidate) => candidate !== model)) {
      assert.equal(validate(result(scenario, wrongModel)), false, `${scenario} accepted ${wrongModel}`);
    }
  }
});

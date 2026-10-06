BEGIN READ ONLY;
WITH ids(test_run_id) AS (VALUES
  ('221157ba-dde4-4fe4-92ff-0bb942c066b4'::uuid),
  ('49a6dfa0-4c96-480f-9d64-7680fa61a626'::uuid),
  ('fbb122dc-2543-4680-b3fb-bf474161ce45'::uuid)
)
SELECT 'acceptance_stage_runs' AS source,r.test_run_id::text,r.stage_id,r.status,r.created_at
FROM acceptance_stage_runs r JOIN ids USING(test_run_id)
UNION ALL
SELECT 'test_runs',r.test_run_id::text,'V1.1',r.status,r.created_at
FROM test_runs r JOIN ids USING(test_run_id)
ORDER BY 1,2;
SELECT 'test_assertions' AS source,a.test_run_id::text,count(*)
FROM test_assertions a JOIN (VALUES
  ('221157ba-dde4-4fe4-92ff-0bb942c066b4'::uuid),
  ('49a6dfa0-4c96-480f-9d64-7680fa61a626'::uuid),
  ('fbb122dc-2543-4680-b3fb-bf474161ce45'::uuid)
) AS ids(test_run_id) USING(test_run_id)
GROUP BY a.test_run_id ORDER BY 2;
COMMIT;

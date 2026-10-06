#!/bin/sh
set -u

ids="'5dc2a5a7-28f1-4c9f-a867-3a676994f5b4','39c9b7c0-080d-45d7-83cf-b8865f6a4b42','d1540cb1-d085-40bf-860d-43031951bd55','5a817c7f-64c0-4c8d-a979-97b44fc9f6ed','25fe0718-5a76-4477-a02b-5e954f621dde','48e32a09-4901-424f-8585-7b01ab9f83f7','113fea95-5fee-42ee-b702-f8423b8a173c','dd1792f9-4947-472d-bd9c-2a0399224068','9a0d9bb5-7106-4b95-b113-bea633aab576','7419dbd9-d635-4ccb-993f-9d66e5f11865','2d236506-042b-4e6c-a386-dfbb6553622f','55417112-6ee9-4eeb-b252-1e0306048a0e','d8c9540e-0ed2-4978-93f9-daaef6dc1e6f'"
socket=/tmp/stockquant-legacy-scan-socket
mkdir -p "$socket"
chmod 777 "$socket"

for source in /volumes/*; do
  [ -f "$source/PG_VERSION" ] || continue
  volume=${source##*/}
  copy="/tmp/stockquant-legacy-scan-$volume"
  rm -rf "$copy"
  mkdir -p "$copy"
  cp -a "$source/." "$copy/" || { printf 'COPY_FAILED\t%s\n' "$volume"; rm -rf "$copy"; continue; }
  rm -f "$copy/postmaster.pid"
  chown -R postgres:postgres "$copy"
  log="/tmp/stockquant-legacy-scan-$volume.log"
  if ! su-exec postgres pg_ctl -D "$copy" -o "-c listen_addresses='' -c unix_socket_directories=$socket" -l "$log" -w start >/dev/null 2>&1; then
    printf 'START_FAILED\t%s\n' "$volume"
    if [ -f "$log" ]; then sed 's/^/  /' "$log"; fi
    rm -rf "$copy" "$log"
    continue
  fi
  databases=$(su-exec postgres psql -h "$socket" -U postgres -d postgres -Atq -c "SELECT datname FROM pg_database WHERE datistemplate=false ORDER BY datname" 2>/dev/null || true)
  database_count=$(printf '%s\n' "$databases" | awk 'NF { count++ } END { print count+0 }')
  matching_tables=0
  for database in $databases; do
    for table in acceptance_stage_runs test_runs; do
      relation=$(su-exec postgres psql -h "$socket" -U postgres -d "$database" -Atq -c "SELECT to_regclass('public.$table')" 2>/dev/null || true)
      [ -n "$relation" ] || continue
      matching_tables=$((matching_tables + 1))
      rows=$(su-exec postgres psql -h "$socket" -U postgres -d "$database" -AtF '|' -c "SELECT test_run_id,stage_id,scenario_id,status FROM public.$table WHERE test_run_id::text IN ($ids) ORDER BY test_run_id" 2>/dev/null || true)
      if [ -n "$rows" ]; then
        printf 'RUN_ROWS\t%s\t%s\t%s\n%s\n' "$volume" "$database" "$table" "$rows"
        if [ "$table" = acceptance_stage_runs ]; then
          su-exec postgres psql -h "$socket" -U postgres -d "$database" -AtF '|' -c "SELECT test_run_id,jsonb_array_length(assertions),(SELECT count(*) FROM jsonb_array_elements(assertions) a WHERE a->>'status'='PASS'),(SELECT count(*) FROM jsonb_array_elements(assertions) a WHERE a->>'status'='FAIL') FROM public.acceptance_stage_runs WHERE test_run_id::text IN ($ids) ORDER BY test_run_id" 2>/dev/null | sed "s/^/ASSERTION_COUNTS\\t$volume\\t$database\\t/"
        fi
      fi
    done
    relation=$(su-exec postgres psql -h "$socket" -U postgres -d "$database" -Atq -c "SELECT to_regclass('public.acceptance_records')" 2>/dev/null || true)
    if [ -n "$relation" ]; then
      matching_tables=$((matching_tables + 1))
      rows=$(su-exec postgres psql -h "$socket" -U postgres -d "$database" -AtF '|' -c "SELECT test_run_id,conclusion FROM public.acceptance_records WHERE test_run_id::text IN ($ids) ORDER BY test_run_id" 2>/dev/null || true)
      [ -z "$rows" ] || printf 'MANUAL_CONCLUSION\t%s\t%s\n%s\n' "$volume" "$database" "$rows"
    fi
  done
  su-exec postgres pg_ctl -D "$copy" -m fast -w stop >/dev/null 2>&1 || printf 'STOP_FAILED\t%s\n' "$volume"
  printf 'SCANNED\t%s\tdatabases=%s\trelevantTables=%s\n' "$volume" "$database_count" "$matching_tables"
  rm -rf "$copy" "$log"
done

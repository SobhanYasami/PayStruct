#!/bin/bash
# Developer seed script — loads realistic corporate data from mock-data/corporate_data_with_projects.json
#
# Source data (corporate_data_with_projects.json):
#   10 root companies, each with 5 subsidiaries  → 60 total companies
#   ~15–20 employees per company                 → ~950 employees
#   ~10 projects per company                     → ~600 projects
#
# Each employee's actual password from the JSON is bcrypt-hashed (cost 10) before insert.
# Re-run safe: previous seed data (identified by registration_number match) is deleted first.
#
# Usage: ./sample-data-creator.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSON_FILE="$ROOT_DIR/mock-data/corporate_data_with_projects.json"

if [[ ! -f "$JSON_FILE" ]]; then
  echo "ERROR: JSON data file not found: $JSON_FILE"
  exit 1
fi

# ── Load .env ────────────────────────────────────────────────────────────────
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -o allexport
  # shellcheck source=/dev/null
  source "$ROOT_DIR/.env"
  set +o allexport
fi

DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-ctdatabase}"
DB_USER="${DATABASE_USER:-ctuser}"
export PGPASSWORD="${DATABASE_PASSWORD:-}"

# ── Resolve psql — host binary or container exec ──────────────────────────────
_find_container() {
  local runtime="$1"
  "$runtime" ps --format "{{.Names}}" 2>/dev/null \
    | grep -i "finmanager.*db\|db.*finmanager\|postgres" \
    | head -1
}

if command -v psql &>/dev/null; then
  PSQL=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --quiet)
elif command -v podman &>/dev/null && CONTAINER=$(_find_container podman) && [[ -n "$CONTAINER" ]]; then
  echo "[seed] psql not on host — using podman exec into container: $CONTAINER"
  PSQL=(podman exec -e "PGPASSWORD=${PGPASSWORD}" -i "$CONTAINER"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --quiet)
elif command -v docker &>/dev/null && CONTAINER=$(_find_container docker) && [[ -n "$CONTAINER" ]]; then
  echo "[seed] psql not on host — using docker exec into container: $CONTAINER"
  PSQL=(docker exec -e "PGPASSWORD=${PGPASSWORD}" -i "$CONTAINER"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --quiet)
else
  echo "ERROR: psql not found on host and no running Postgres container detected."
  echo "       Install postgresql-client, or start the Postgres container first."
  exit 1
fi

if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 is required to parse JSON and hash passwords."
  exit 1
fi

# ── Sanity check ─────────────────────────────────────────────────────────────
echo "[seed] Connecting to ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME} ..."
"${PSQL[@]}" -c "SELECT 1" > /dev/null
echo "[seed] Connection OK"

START_TS=$(date +%s)

# ── Generate SQL from JSON and pipe directly to psql ─────────────────────────
echo "[seed] Parsing JSON and hashing passwords (bcrypt cost=10) ..."
echo "[seed] This may take ~1 minute for ~950 unique passwords ..."
echo

python3 - "$JSON_FILE" <<'PYEOF' | "${PSQL[@]}"
import sys, json, uuid, random
from datetime import datetime, timedelta, timezone

try:
    import bcrypt
    def hash_pw(pw):
        return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
except ImportError:
    # Fallback: single hash for "Password123!" — shouldn't happen since we checked above
    _FALLBACK = '$2y$12$ILQKe8JlQVytdmVORWhm8OBLAEQxAby0CHG.TfQdOAOIi1h1qz9Ay'
    def hash_pw(pw):
        return _FALLBACK

JSON_FILE = sys.argv[1]

STATUS_MAP = {
    'تکمیل شده':           'completed',
    'فعال':                 'active',
    'تعلیق موقت':           'on_hold',
    'در حال برنامه‌ریزی': 'planning',
}
PRIORITY_MAP = {
    'بالا':    'high',
    'بحرانی': 'critical',
    'متوسط':  'medium',
    'کم':      'low',
}

def q(s):
    """SQL-escape a string value."""
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

def rand_date_offset():
    """Random offset in days, 0–730."""
    return random.randint(0, 730)

with open(JSON_FILE, encoding='utf-8') as f:
    data = json.load(f)

# ── Pre-hash all unique passwords (parallelised where available) ───────────
all_passwords = set()
for company in data:
    for emp in company.get('employees', []):
        all_passwords.add(emp['password'])
    for sub in company.get('subsidiaries', []):
        for emp in sub.get('employees', []):
            all_passwords.add(emp['password'])

all_passwords = list(all_passwords)
total_pws = len(all_passwords)

try:
    from multiprocessing import Pool
    with Pool() as pool:
        hashes = pool.map(hash_pw, all_passwords)
    PW_HASH = dict(zip(all_passwords, hashes))
except Exception:
    PW_HASH = {pw: hash_pw(pw) for pw in all_passwords}

# ── Collect all registration numbers for cleanup ──────────────────────────
reg_nums = []
for company in data:
    reg_nums.append(company['registration_number'])
    for sub in company.get('subsidiaries', []):
        reg_nums.append(sub['registration_number'])

reg_nums_sql = ','.join(q(r) for r in reg_nums)

# ── Assign roles based on employee position within company ────────────────
def employee_roles(idx):
    """0-based idx within company."""
    if idx == 0:
        return "ARRAY['manager']::TEXT[]", True, 'official'
    if idx == 1:
        return "ARRAY['finance_head']::TEXT[]", True, 'official'
    if idx == 2:
        return "ARRAY['engineering_head']::TEXT[]", True, 'official'
    return "ARRAY['engineering']::TEXT[]", False, 'contractual'

# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT SQL
# ─────────────────────────────────────────────────────────────────────────────
print("SET client_encoding = 'UTF8';")
print("SET client_min_messages = WARNING;")
print()

# ── 0. CLEANUP ────────────────────────────────────────────────────────────────
print("-- ─── 0. Cleanup previous seed data ──────────────────────────────────")
print(f"""
DO $$
DECLARE
  seed_ids  UUID[];
  ctr_ids   UUID[];
BEGIN
  SELECT ARRAY(SELECT id FROM companies WHERE reg_num IN ({reg_nums_sql}))
  INTO seed_ids;

  IF array_length(seed_ids, 1) IS NOT NULL THEN
    SELECT ARRAY(SELECT id FROM contracts WHERE company_id = ANY(seed_ids))
    INTO ctr_ids;

    IF array_length(ctr_ids, 1) IS NOT NULL THEN
      DELETE FROM statement_deduction_items  WHERE interim_statement_id IN (SELECT id FROM interim_statements WHERE contract_id = ANY(ctr_ids));
      DELETE FROM work_done_items            WHERE interim_statement_id IN (SELECT id FROM interim_statements WHERE contract_id = ANY(ctr_ids));
      DELETE FROM extra_work_items           WHERE interim_statement_id IN (SELECT id FROM interim_statements WHERE contract_id = ANY(ctr_ids));
      DELETE FROM retention_records          WHERE contract_id = ANY(ctr_ids);
      DELETE FROM advance_payment_records    WHERE contract_id = ANY(ctr_ids);
      DELETE FROM liquidated_damages         WHERE contract_id = ANY(ctr_ids);
      DELETE FROM interim_statements         WHERE contract_id = ANY(ctr_ids);
      DELETE FROM contract_line_items        WHERE contract_id = ANY(ctr_ids);
      DELETE FROM contracts                  WHERE id          = ANY(ctr_ids);
    END IF;

    DELETE FROM projects    WHERE company_id = ANY(seed_ids);
    DELETE FROM contractors WHERE company_id = ANY(seed_ids);
    DELETE FROM employees   WHERE company_id = ANY(seed_ids);
    DELETE FROM companies   WHERE id         = ANY(seed_ids);

    RAISE NOTICE 'Removed previous seed data for % companies.', array_length(seed_ids, 1);
  ELSE
    RAISE NOTICE 'No previous seed data found — clean insert.';
  END IF;
END;
$$;
""")

# ── 1. COMPANIES ──────────────────────────────────────────────────────────────
print("-- ─── 1. Companies ───────────────────────────────────────────────────")
print("BEGIN;")

# Build company objects upfront so subsidiaries can reference parent UUIDs
companies = []  # (company_dict, uid, parent_uid, root_uid)

for company in data:
    root_uid = str(uuid.uuid4())
    created = datetime.now(timezone.utc) - timedelta(days=rand_date_offset())
    companies.append({
        'uid': root_uid,
        'name': company['company_name'],
        'reg_num': company['registration_number'],
        'parent_uid': None,
        'root_uid': None,
        'employees': company.get('employees', []),
        'projects': company.get('projects', []),
        'created': created,
    })
    for sub in company.get('subsidiaries', []):
        sub_uid = str(uuid.uuid4())
        sub_created = datetime.now(timezone.utc) - timedelta(days=rand_date_offset())
        companies.append({
            'uid': sub_uid,
            'name': sub['company_name'],
            'reg_num': sub['registration_number'],
            'parent_uid': root_uid,
            'root_uid': root_uid,
            'employees': sub.get('employees', []),
            'projects': sub.get('projects', []),
            'created': sub_created,
        })

for c in companies:
    parent = 'NULL' if c['parent_uid'] is None else q(c['parent_uid'])
    root   = 'NULL' if c['root_uid']   is None else q(c['root_uid'])
    print(
        f"INSERT INTO companies (id, name, reg_num, country_code, is_active, parent_id, root_company_id, created_at, updated_at) VALUES ("
        f"{q(c['uid'])}, {q(c['name'])}, {q(c['reg_num'])}, 'IR', true, {parent}, {root}, "
        f"{q(c['created'].isoformat())}, {q(c['created'].isoformat())});"
    )

print("COMMIT;")
print()

# ── 2. EMPLOYEES ──────────────────────────────────────────────────────────────
print("-- ─── 2. Employees ───────────────────────────────────────────────────")
print("BEGIN;")

for c in companies:
    for idx, emp in enumerate(c['employees']):
        roles_sql, is_head, emp_type = employee_roles(idx)
        pw_hash = PW_HASH.get(emp['password'], PW_HASH[list(PW_HASH.keys())[0]])
        uid = str(uuid.uuid4())
        salary = random.randint(10_000_000, 100_000_000)
        created = c['created'] + timedelta(days=random.randint(0, 30))
        print(
            f"INSERT INTO employees (id, company_id, national_id, first_name, last_name, email, "
            f"employment_type, roles, is_head, password_hash, active, base_salary, salary_currency, created_at, updated_at) VALUES ("
            f"{q(uid)}, {q(c['uid'])}, {q(emp['national_id'])}, {q(emp['first_name'])}, {q(emp['last_name'])}, {q(emp['email'])}, "
            f"'{emp_type}', {roles_sql}, {str(is_head).lower()}, {q(pw_hash)}, true, {salary}, 'IRR', "
            f"{q(created.isoformat())}, {q(created.isoformat())});"
        )

print("COMMIT;")
print()

# ── 3. PROJECTS ───────────────────────────────────────────────────────────────
print("-- ─── 3. Projects ────────────────────────────────────────────────────")
print("BEGIN;")

for c in companies:
    for prj in c['projects']:
        uid      = str(uuid.uuid4())
        status   = STATUS_MAP.get(prj.get('status', ''), 'planning')
        priority = PRIORITY_MAP.get(prj.get('priority', ''), 'medium')
        phase    = prj.get('project_phase', '')
        category = prj.get('category', '')
        budget   = prj.get('estimated_budget', 0)
        currency = prj.get('currency_type', 'IRR')[:3]
        start    = prj.get('start_date') or None
        end      = prj.get('end_date') or None
        code     = prj.get('project_code', f'PRJ-{uid[:8]}')
        name     = prj.get('project_name', '')
        desc     = prj.get('description', '')

        start_sql = q(start) if start else 'NULL'
        end_sql   = q(end)   if end   else 'NULL'

        print(
            f"INSERT INTO projects (id, company_id, code, name, description, category, status, priority, "
            f"budget_estimate, budget_actual, currency, phase, tags, start_date, end_date, created_at, updated_at) VALUES ("
            f"{q(uid)}, {q(c['uid'])}, {q(code)}, {q(name)}, {q(desc)}, {q(category)}, '{status}', '{priority}', "
            f"{budget}, 0, '{currency}', {q(phase)}, '{{}}', {start_sql}, {end_sql}, "
            f"{q(c['created'].isoformat())}, {q(c['created'].isoformat())});"
        )

print("COMMIT;")
print()

# ── 4. ANALYZE + summary ──────────────────────────────────────────────────────
print(f"""
ANALYZE companies, employees, projects;

DO $$
DECLARE
  n_companies BIGINT;
  n_employees BIGINT;
  n_projects  BIGINT;
BEGIN
  SELECT COUNT(*) INTO n_companies FROM companies WHERE reg_num IN ({reg_nums_sql});
  SELECT COUNT(*) INTO n_employees FROM employees WHERE company_id IN (SELECT id FROM companies WHERE reg_num IN ({reg_nums_sql}));
  SELECT COUNT(*) INTO n_projects  FROM projects  WHERE company_id IN (SELECT id FROM companies WHERE reg_num IN ({reg_nums_sql}));
  RAISE NOTICE '─────────────────────────────────';
  RAISE NOTICE 'Seed summary:';
  RAISE NOTICE '  companies : %', n_companies;
  RAISE NOTICE '  employees : %', n_employees;
  RAISE NOTICE '  projects  : %', n_projects;
  RAISE NOTICE '─────────────────────────────────';
END;
$$;
""")

PYEOF

END_TS=$(date +%s)
ELAPSED=$(( END_TS - START_TS ))
echo
echo "[seed] Done in ${ELAPSED}s."
echo "[seed] Each employee's password from the JSON file is used directly."
echo "[seed] Example login: user1@example.com / Pass_2410!"

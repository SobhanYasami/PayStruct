#!/usr/bin/env python3
"""
Mock data seeder — hits the live REST API to insert test fixtures.

Seeding order:
  1. Companies (parent → sub, with employees + head assignment)
  2. Projects
  3. Contractors
  4. Consultants

Reads credentials + base URL from env (falls back to dev defaults):
  API_URL             default: http://localhost:5000/api/v1
  BOOTSTRAP_USERNAME  default: admin@system.local
  BOOTSTRAP_PASSWORD  default: admin123
"""

import os
import sys
import json
import urllib.request
import urllib.error

API_BASE = os.environ.get("API_URL", "http://localhost:5000/api/v1")
EMAIL    = os.environ.get("BOOTSTRAP_USERNAME", "admin@system.local")
PASSWORD = os.environ.get("BOOTSTRAP_PASSWORD", "admin123")

# position (Persian) → roles array sent to API
POSITION_ROLES: dict[str, list[str]] = {
    "مدیر عامل":   ["manager"],
    "مدیر مالی":   ["finance_head"],
    "مدیر حقوقی":  ["juridical_head"],
    "مدیر فنی":    ["engineering_head"],
    "مدیر امنیت":  ["security_head"],
    "کارمند فنی":  ["engineering"],
    "کارمند مالی": ["finance"],
    "کارمند امنیت":["security"],
}

# position → company head field for the UPDATE call
POSITION_HEAD_FIELD: dict[str, str] = {
    "مدیر عامل":  "manager_id",
    "مدیر مالی":  "financial_head_id",
    "مدیر حقوقی": "juridical_head_id",
    "مدیر فنی":   "engineering_head_id",
    "مدیر امنیت": "security_head_id",
}


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _request(method: str, path: str, body: dict | None, token: str | None) -> dict:
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    headers: dict[str, str] = {}
    if data:
        headers["Content-Type"] = "application/json; charset=utf-8"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        f"{API_BASE}{path}", data=data, headers=headers, method=method
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        print(f"  ✗ HTTP {e.code} {method} {path}: {raw}")
        return {}


def post(path: str, body: dict, token: str) -> dict:
    return _request("POST", path, body, token)


def put(path: str, body: dict, token: str) -> dict:
    return _request("PUT", path, body, token)


def extract_id(resp: dict) -> str | None:
    data = resp.get("data") or {}
    if isinstance(data, dict):
        return data.get("id")
    return None


def ok(resp: dict, label: str) -> bool:
    if resp.get("status") == "success" or resp.get("data"):
        print(f"  ✓ {label}")
        return True
    print(f"  ✗ {label}: {resp}")
    return False


# ── auth ─────────────────────────────────────────────────────────────────────

def login() -> str:
    print(f"Logging in as {EMAIL} …")
    resp  = _request("POST", "/users/auth/signin",
                     {"email": EMAIL, "password": PASSWORD}, None)
    token = (resp.get("data") or {}).get("token", "")
    if not token:
        print("Login failed — check EMAIL/PASSWORD and that the server is running.")
        sys.exit(1)
    print("  ✓ authenticated\n")
    return token


# ── fixtures ─────────────────────────────────────────────────────────────────

COMPANIES = [
    {
        "name": "خانه سازی تهران",
        "reg_num": "123",
        "employees": [
            {
                "first_name": "محمد",
                "last_name": "احمدی",
                "position": "مدیر عامل",
                "email": "m.ahmadi@bayganeman.ir",
                "password": "pass1234",
                "national_num": "0012345678"
            },
            {
                "first_name": "سارا",
                "last_name": "حسینی",
                "position": "مدیر مالی",
                "email": "s.hoseini@bayganeman.ir",
                "password": "pass1234",
                "national_num": "0023456789"
            },
            {
                "first_name": "امیر",
                "last_name": "کریمی",
                "position": "مدیر حقوقی",
                "email": "a.karimi@bayganeman.ir",
                "password": "pass1234",
                "national_num": "0034567890"
            },
            {
                "first_name": "نیما",
                "last_name": "صادقی",
                "position": "مدیر فنی",
                "email": "n.sadeghi@bayganeman.ir",
                "password": "pass1234",
                "national_num": "0045678901"
            },
            {
                "first_name": "رضا",
                "last_name": "علوی",
                "position": "کارمند فنی",
                "email": "r.alavi@bayganeman.ir",
                "password": "pass1234",
                "national_num": "0056789012"
            },
            {
                "first_name": "مریم",
                "last_name": "هاشمی",
                "position": "کارمند مالی",
                "email": "m.hashemi@bayganeman.ir",
                "password": "pass1234",
                "national_num": "0067890123"
            }
        ],
        "sub_companies": [
            {
                "name": "خانه سازی گیلان",
                "reg_num": "1234",
                "employees": [
                    {
                        "first_name": "سعید",
                        "last_name": "نادری",
                        "position": "مدیر عامل",
                        "email": "s.naderi@bayganeman.ir",
                        "password": "pass1234",
                        "national_num": "0190123456"
                    },
                    {
                        "first_name": "مینا",
                        "last_name": "فتوحی",
                        "position": "مدیر مالی",
                        "email": "m.fotouhi@bayganeman.ir",
                        "password": "pass1234",
                        "national_num": "0201234567"
                    },
                    {
                        "first_name": "فرهاد",
                        "last_name": "عباسی",
                        "position": "مدیر حقوقی",
                        "email": "f.abbasi@bayganeman.ir",
                        "password": "pass1234",
                        "national_num": "0212345678"
                    },
                    {
                        "first_name": "آرش",
                        "last_name": "کاظمی",
                        "position": "مدیر فنی",
                        "email": "a.kazemi@bayganeman.ir",
                        "password": "pass1234",
                        "national_num": "0223456789"
                    },
                    {
                        "first_name": "سهراب",
                        "last_name": "منصوری",
                        "position": "کارمند فنی",
                        "email": "s.mansouri@bayganeman.ir",
                        "password": "pass1234",
                        "national_num": "0234567890"
                    },
                    {
                        "first_name": "نازنین",
                        "last_name": "موسوی",
                        "position": "کارمند مالی",
                        "email": "n.mousavi@bayganeman.ir",
                        "password": "pass1234",
                        "national_num": "0245678901"
                    }
                ]
            },
            {
                "name": "خانه سازی اصفهان",
                "reg_num": "1235"
            },
            {
                "name": "خانه سازی زنجان",
                "reg_num": "1236"
            },
        ]
    }
]


PROJECTS = [
    {
        "code": "PRJ-RASHT-01",
        "name": "رشت",
        "description": "پروژه عمرانی شهری رشت",
        "category": "شهرسازی",
        "phase": "اجرا",
        "status": "active",
        "priority": "high",
        "start_date": "2026-01-01",
        "end_date":   "2027-06-30",
        "budget_estimate": "50000000000",
        "currency": "IRR",
        "tags": ["عمران", "شهری"],
    },
    {
        "code": "PRJ-ANZALI-01",
        "name": "انزلی",
        "description": "توسعه زیرساخت بندر انزلی",
        "category": "ابنیه سنگین",
        "phase": "طراحی",
        "status": "planning",
        "priority": "high",
        "start_date": "2026-03-01",
        "end_date":   "2028-03-01",
        "budget_estimate": "80000000000",
        "currency": "IRR",
        "tags": ["بندر", "زیرساخت"],
    },
    {
        "code": "PRJ-MODARES-01",
        "name": "مدرس",
        "description": "احداث مجتمع فرهنگی مدرس",
        "category": "ابنیه",
        "phase": "امکان‌سنجی",
        "status": "planning",
        "priority": "medium",
        "start_date": "2026-06-01",
        "end_date":   "2027-12-31",
        "budget_estimate": "30000000000",
        "currency": "IRR",
        "tags": ["فرهنگی"],
    },
    {
        "code": "PRJ-GOLSAR-01",
        "name": "گلسار",
        "description": "بازسازی و نوسازی محله گلسار رشت",
        "category": "شهرسازی",
        "phase": "اجرا",
        "status": "active",
        "priority": "medium",
        "start_date": "2025-09-01",
        "end_date":   "2026-12-31",
        "budget_estimate": "20000000000",
        "currency": "IRR",
        "tags": ["بازسازی", "مسکونی"],
    },
    {
        "code": "PRJ-MANZARIE-01",
        "name": "منظریه",
        "description": "پروژه توسعه پارک منظریه",
        "category": "فضای سبز",
        "phase": "اجرا",
        "status": "active",
        "priority": "low",
        "start_date": "2026-01-15",
        "end_date":   "2026-09-30",
        "budget_estimate": "8000000000",
        "currency": "IRR",
        "tags": ["پارک", "فضای سبز"],
    },
]

CONTRACTORS = [
    {
        "type":             "company",
        "company_name":     "بتن ایران",
        "legal_name":       "شرکت بتن ایران (سهامی خاص)",
        "tax_id":           "1234567890",
        "registration_no":  "123456",
        "national_id":      "",
        "default_currency": "IRR",
        "rating":           4.2,
    },
    {
        "type":             "company",
        "company_name":     "بارساز شمال",
        "legal_name":       "شرکت بارساز شمال (سهامی خاص)",
        "tax_id":           "9876543210",
        "registration_no":  "654321",
        "national_id":      "",
        "default_currency": "IRR",
        "rating":           3.8,
    },
    {
        "type":             "individual",
        "first_name":       "یعقوب",
        "last_name":        "پورقربان",
        "company_name":     "",
        "legal_name":       "",
        "tax_id":           "1111111111",
        "registration_no":  "",
        "national_id":      "2720123456",
        "default_currency": "IRR",
        "rating":           4.0,
    },
]

CONSULTANTS = [
    {
        "name":             "مهندسین مشاور آباد",
        "legal_name":       "شرکت مهندسین مشاور آباد (سهامی خاص)",
        "registration_no":  "789012",
        "tax_id":           "5555555555",
        "specialization":   "مهندسی عمران و ساختمان",
        "license_no":       "LIC-1402-001",
        "license_expiry":   "2028-03-20",
        "default_currency": "IRR",
        "rating":           4.5,
        "is_active":        True,
    },
]


# ── seeding logic ─────────────────────────────────────────────────────────────

def seed_employees(employees: list[dict], company_id: str, token: str) -> dict[str, str]:
    """Create employees for a company; return {head_field: employee_id} for heads."""
    heads: dict[str, str] = {}
    for emp in employees:
        position = emp.get("position", "")
        roles    = POSITION_ROLES.get(position, [])
        req = {
            "first_name":      emp["first_name"],
            "last_name":       emp["last_name"],
            "email":           emp["email"],
            "national_id":     emp.get("national_num") or emp.get("national_id", ""),
            "password":        emp["password"],
            "roles":           roles,
            "company_id":      company_id,
            "employment_type": "official",
        }
        resp = post("/users/employees/create", req, token)
        label = f"{emp['first_name']} {emp['last_name']} ({position})"
        if ok(resp, label):
            emp_id = extract_id(resp)
            head_field = POSITION_HEAD_FIELD.get(position)
            if emp_id and head_field:
                heads[head_field] = emp_id
    return heads


def seed_company(company: dict, token: str, parent_id: str | None = None) -> str | None:
    """Create a company, its employees, and wire heads. Returns created company ID."""
    req: dict = {"name": company["name"], "reg_num": company["reg_num"]}
    if parent_id:
        req["parent_id"] = parent_id

    resp = post("/company/management", req, token)
    if not ok(resp, company["name"]):
        return None
    company_id = extract_id(resp)
    if not company_id:
        print(f"  ✗ no id in response for {company['name']}")
        return None

    employees = company.get("employees") or []
    if employees:
        heads = seed_employees(employees, company_id, token)
        if heads:
            update_body = {"name": company["name"], "reg_num": company["reg_num"]}
            update_body.update(heads)
            put_resp = put(f"/company/management/{company_id}", update_body, token)
            if ok(put_resp, f"  → heads assigned for {company['name']}"):
                pass

    return company_id


def seed_companies(token: str) -> None:
    print("Creating companies …")
    for company in COMPANIES:
        company_id = seed_company(company, token)
        if not company_id:
            continue
        for sub in company.get("sub_companies") or []:
            seed_company(sub, token, parent_id=company_id)


# ── main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    token = login()

    seed_companies(token)

    print("\nCreating projects …")
    for p in PROJECTS:
        ok(post("/projects", p, token), p["name"])

    print("\nCreating contractors …")
    for c in CONTRACTORS:
        label = (c.get("company_name") or
                 f"{c.get('first_name', '')} {c.get('last_name', '')}".strip())
        ok(post("/contractors", c, token), label)

    print("\nCreating consultant engineering companies …")
    for c in CONSULTANTS:
        ok(post("/consultants", c, token), c["name"])

    print("\nDone.")


if __name__ == "__main__":
    main()

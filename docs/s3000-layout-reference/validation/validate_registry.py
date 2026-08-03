#!/usr/bin/env python3
"""Validate S3000 layout-reference registry against local contracts (stdlib only)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "registry"
DOC_TYPES = REGISTRY / "document-types"

errors: list[str] = []
warnings: list[str] = []


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    meta = load(REGISTRY / "meta.json")
    sources = load(REGISTRY / "sources.json")
    index = load(REGISTRY / "index.json")
    source_ids = {s["id"] for s in sources["sources"]}
    type_ids = {t["id"] for t in index["document_types"]}

    if "No V2.1.2 renderer implementation or modification" not in meta.get("scope_exclusions", []):
        errors.append("NR4: meta.scope_exclusions missing renderer exclusion")
    if "No PASS claim" not in meta.get("scope_exclusions", []):
        errors.append("NR4: meta.scope_exclusions missing no PASS claim")

    docs = []
    for p in sorted(DOC_TYPES.glob("*.json")):
        docs.append(load(p))

    if len(docs) != len(type_ids):
        errors.append(f"index/document-types count mismatch: {len(type_ids)} vs {len(docs)}")

    for d in docs:
        did = d["id"]
        for key in [
            "authoritative_sources",
            "structural_fields",
            "page_hierarchy",
            "realistic_density_and_continuation",
            "tables_signatures_identifiers",
            "common_document_relationships",
            "safe_fictionalisation_rules",
            "applicable_charge_procedure_families",
            "visual_qa_requirements",
            "prohibited_copying_or_unsupported_assumptions",
        ]:
            if key not in d:
                errors.append(f"{did}: missing {key}")

        orders = [f["order"] for f in d.get("structural_fields", [])]
        if orders != sorted(orders) or len(orders) != len(set(orders)):
            errors.append(f"{did}: RF2 structural_fields.order must be unique ascending")

        dens = d.get("realistic_density_and_continuation", {})
        tp = dens.get("typical_pages", {})
        if not (tp.get("min", 0) <= tp.get("mode", -1) <= tp.get("max", -2)):
            errors.append(f"{did}: RF4 typical_pages min<=mode<=max failed")

        if dens.get("typical_pages", {}).get("max", 1) > 1 and not dens.get("continuation_behaviour"):
            errors.append(f"{did}: VQ2 missing continuation_behaviour")

        if len(d.get("visual_qa_requirements", [])) < 3:
            errors.append(f"{did}: VQ1 visual_qa_requirements < 3")

        for sid in d.get("authoritative_sources", []):
            if sid not in source_ids:
                errors.append(f"{did}: SA1 unknown source {sid}")

        for rel in d.get("common_document_relationships", []):
            if rel.get("to") not in type_ids:
                errors.append(f"{did}: RI1 bad relationship target {rel.get('to')}")

        prohib = " ".join(d.get("prohibited_copying_or_unsupported_assumptions", [])).lower()
        if "private case papers" not in prohib:
            errors.append(f"{did}: FS2 missing private case papers prohibition")
        if "personal data" not in prohib and "pii" not in prohib and "protected personal" not in prohib:
            errors.append(f"{did}: FS2 missing personal-data/PII prohibition")

        if did == "youth-justice":
            field_names = {f["name"] for f in d.get("structural_fields", [])}
            if "reporting_restrictions_banner" not in field_names:
                errors.append("youth-justice: FS4 missing reporting_restrictions_banner field")

        # crude real-data smell check (ignore instructional ban phrases)
        blob = json.dumps(d).lower()
        for smell in ["@gmail.com", "@hotmail.com", "@yahoo.com"]:
            if smell in blob:
                warnings.append(f"{did}: possible real-data smell '{smell}'")

    # source authority coverage
    authority_ok = {
        "primary_secondary_legislation",
        "statutory_code",
        "official_guidance",
        "official_forms_index",
        "official_scheme",
        "prosecution_guidance",
        "national_policing_guidance",
    }
    src_by_id = {s["id"]: s for s in sources["sources"]}
    for d in docs:
        classes = {src_by_id[s]["authority_class"] for s in d["authoritative_sources"] if s in src_by_id}
        if not (classes & authority_ok):
            errors.append(f"{d['id']}: SA3 no acceptable authority_class")

    for w in warnings:
        print("WARNING:", w)
    for e in errors:
        print("ERROR:", e)

    print(f"validated_document_types={len(docs)} sources={len(source_ids)} errors={len(errors)} warnings={len(warnings)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())

import re
from typing import List, Dict, Any, Tuple, Set
from ..models import ValidationReport, ValidationRowDiagnostic

def extract_template_variables(text: str) -> List[str]:
    """Extracts all {{var}} identifiers from a template text."""
    if not text:
        return []
    matches = re.findall(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}", text)
    return list(dict.fromkeys(matches)) # preserve order, deduplicate

def validate_and_normalize_recipients(
    channel: str,
    raw_rows: List[Dict[str, Any]],
    column_mapping: Dict[str, str],
    template_body: str,
    template_subject: str = ""
) -> ValidationReport:
    """
    Validates recipient list against channel rules, duplicate checks, and template variables.
    """
    needed_variables = extract_template_variables(template_body + " " + (template_subject or ""))
    
    id_column = column_mapping.get("email") if channel == "gmail" else column_mapping.get("phone")
    name_column = column_mapping.get("name")

    seen_identifiers: Set[str] = set()
    valid_count = 0
    invalid_count = 0
    duplicate_count = 0
    missing_vars_count = 0
    diagnostics: List[ValidationRowDiagnostic] = []

    for idx, row in enumerate(raw_rows):
        row_num = idx + 1
        raw_id = str(row.get(id_column, "")).strip() if id_column else ""
        raw_name = str(row.get(name_column, "")).strip() if name_column else ""
        
        status = "VALID"
        error_msg = None

        # 1. Check for identifier presence and validity
        if not raw_id:
            status = "INVALID"
            error_msg = f"Missing {channel.capitalize()} recipient identifier (column '{id_column or 'unmapped'}')"
        elif channel == "gmail":
            email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
            if not re.match(email_regex, raw_id):
                status = "INVALID"
                error_msg = f"Invalid email format: '{raw_id}'"
            else:
                raw_id = raw_id.lower()
        elif channel == "whatsapp":
            cleaned = re.sub(r"[\s\(\)\-\.]", "", raw_id)
            if not re.match(r"^\+?[1-9]\d{6,14}$", cleaned):
                status = "INVALID"
                error_msg = f"Invalid phone format: '{raw_id}'. Must be E.164 (7-15 digits with country code)"
            else:
                if not cleaned.startswith("+"):
                    cleaned = "+" + cleaned
                raw_id = cleaned

        # 2. Check for duplicates
        if status == "VALID":
            if raw_id in seen_identifiers:
                status = "DUPLICATE"
                error_msg = f"Duplicate {channel} recipient: '{raw_id}'"
                duplicate_count += 1
            else:
                seen_identifiers.add(raw_id)

        # 3. Check for template variable completeness
        missing_in_row = []
        for var in needed_variables:
            mapped_col = column_mapping.get(var, var)
            val = str(row.get(mapped_col, "")).strip()
            if not val:
                missing_in_row.append(var)

        if missing_in_row and status == "VALID":
            missing_vars_count += 1
            # Warning or flagging
            error_msg = f"Missing variables: {', '.join(['{{' + v + '}}' for v in missing_in_row])}"
            # In PRD, if required variable is missing, flag row
            status = "INVALID"

        if status == "VALID":
            valid_count += 1
        elif status == "INVALID":
            invalid_count += 1

        diagnostics.append(ValidationRowDiagnostic(
            row_number=row_num,
            name=raw_name or None,
            identifier=raw_id or None,
            status=status,
            error=error_msg,
            variables={k: str(v).strip() for k, v in row.items()}
        ))

    available_vars = list(raw_rows[0].keys()) if raw_rows else []

    return ValidationReport(
        total_rows=len(raw_rows),
        valid_count=valid_count,
        invalid_count=invalid_count,
        duplicate_count=duplicate_count,
        missing_variables_count=missing_vars_count,
        sample_rows=diagnostics,
        available_variables=available_vars
    )

import csv
import io
import re
from typing import List, Dict, Any, Tuple
import openpyxl

EMAIL_CANDIDATES = {"email", "e-mail", "email_address", "mail", "recipient_email", "emailaddress"}
PHONE_CANDIDATES = {"phone", "mobile", "phone_number", "mobile_number", "whatsapp", "cell", "tel", "contact", "phonenumber"}
NAME_CANDIDATES = {"name", "full_name", "fullname", "first_name", "recipient_name", "customer_name", "student_name", "attendee"}

def parse_csv_content(content: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Parses CSV bytes and returns (headers, rows)."""
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows_raw = list(reader)
    if not rows_raw:
        return [], []
    
    headers = [h.strip() for h in rows_raw[0] if h.strip()]
    data_rows = []
    for row in rows_raw[1:]:
        if not any(cell.strip() for cell in row):
            continue # Skip empty rows
        row_dict = {}
        for idx, header in enumerate(headers):
            val = row[idx].strip() if idx < len(row) else ""
            row_dict[header] = val
        data_rows.append(row_dict)
    
    return headers, data_rows

def parse_xlsx_content(content: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Parses XLSX bytes using openpyxl and returns (headers, rows)."""
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    ws = wb.active
    rows_raw = list(ws.iter_rows(values_only=True))
    if not rows_raw:
        return [], []

    first_row = rows_raw[0]
    headers = [str(h).strip() for h in first_row if h is not None and str(h).strip()]
    
    data_rows = []
    for row in rows_raw[1:]:
        if not any(cell is not None and str(cell).strip() for cell in row):
            continue
        row_dict = {}
        for idx, header in enumerate(headers):
            val = row[idx] if idx < len(row) else ""
            row_dict[header] = str(val).strip() if val is not None else ""
        data_rows.append(row_dict)

    return headers, data_rows

def infer_column_mappings(headers: List[str], sample_rows: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Intelligently infers candidate column mappings for 'email', 'phone', and 'name'.
    Uses header keyword matching and sample data pattern inspection.
    """
    inferred: Dict[str, str] = {}

    for h in headers:
        clean_h = re.sub(r"[^a-zA-Z0-9]", "", h.lower())
        if clean_h in EMAIL_CANDIDATES or "email" in clean_h:
            inferred.setdefault("email", h)
        elif clean_h in PHONE_CANDIDATES or "phone" in clean_h or "mobile" in clean_h or "whatsapp" in clean_h:
            inferred.setdefault("phone", h)
        elif clean_h in NAME_CANDIDATES or "name" in clean_h:
            inferred.setdefault("name", h)

    # Secondary inspection: inspect sample row content if header wasn't matched
    if "email" not in inferred and sample_rows:
        for h in headers:
            sample_val = str(sample_rows[0].get(h, ""))
            if "@" in sample_val and "." in sample_val:
                inferred["email"] = h
                break

    if "phone" not in inferred and sample_rows:
        for h in headers:
            sample_val = re.sub(r"[\s\+\-\(\)]", "", str(sample_rows[0].get(h, "")))
            if sample_val.isdigit() and len(sample_val) >= 7:
                inferred["phone"] = h
                break

    return inferred

#!/usr/bin/env python3
"""Convert the supplied CUPS XLSX workbook into the compact runtime catalog."""

import csv
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path


NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
ODONTOLOGY_TERMS = (
    "ODONTO", "DENTAL", "DIENTE", "DIENTES", "ENDODON", "PERIODON", "GINGIV",
    "MAXILAR", "MANDIB", "BUCAL", "BOCA", "ORAL", "OCLUS", "PERIAPICAL",
    "PANORAM", "CEFALOM", "ORTODON", "PROTESIS DENT", "IMPLANTE DENT",
    "ARTICULACION TEMPOROMANDIBULAR", "ATM", "PULPAR", "PULPECT", "PULPOT",
)
PRIORITY_CODES = {
    "890203", "890204", "890403", "870112", "870113", "870114", "870440",
    "870450", "870451", "870452", "870453", "870454", "870455", "870456", "870131",
}


def normalize(value):
    text = unicodedata.normalize("NFKD", value or "")
    return "".join(char for char in text if not unicodedata.combining(char)).upper()


def value(cell):
    return "".join(cell.itertext()).strip()


def main(source, destination):
    with zipfile.ZipFile(source) as workbook:
        root = ET.fromstring(workbook.read("xl/worksheets/sheet3.xml"))
    rows = root.findall(".//m:sheetData/m:row", NS)[1:]
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(("code", "name", "section", "enabled", "surgical", "min_quantity", "max_quantity", "diagnosis_required", "sex", "scope", "stay", "coverage", "odontology", "priority"))
        for row in rows:
            cells = {re.match(r"[A-Z]+", cell.attrib["r"]).group(): value(cell) for cell in row.findall("m:c", NS)}
            code, name = cells.get("B", ""), cells.get("C", "")
            if not code or not name:
                continue
            normalized = normalize(name)
            odontological = code in PRIORITY_CODES or any(term in normalized for term in ODONTOLOGY_TERMS)
            writer.writerow((code, name, cells.get("D", ""), cells.get("E", ""), cells.get("F", ""), cells.get("G", ""), cells.get("H", ""), cells.get("I", ""), cells.get("J", ""), cells.get("K", ""), cells.get("L", ""), "", int(odontological), int(code in PRIORITY_CODES)))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Uso: import_cups_xlsx.py ORIGEN.xlsx DESTINO.csv")
    main(Path(sys.argv[1]), Path(sys.argv[2]))

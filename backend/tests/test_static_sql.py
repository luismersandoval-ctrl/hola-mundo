from pathlib import Path


def test_dynamic_sql_is_isolated_to_allowlisted_migration_module():
    backend = Path(__file__).parents[1]
    offenders = []
    for path in backend.rglob("*.py"):
        if path.name == "sql.py" or "tests" in path.parts or "site-packages" in path.parts or "venv" in path.parts:
            continue
        source = path.read_text(encoding="utf-8")
        if "text(f\"" in source or "execute(f\"" in source or "text(f'" in source or "execute(f'" in source:
            offenders.append(str(path.relative_to(backend)))
    assert offenders == []

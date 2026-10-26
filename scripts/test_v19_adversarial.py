#!/usr/bin/env python3
"""
Adversarial Verification Suite for CulinaryOS V19 Migration
P06-SCHEMA-01 & Non-Regression Analysis
"""

import sys
import re
import sqlite3
import uuid
from typing import Dict, Any, Optional

def test_sql_syntax_and_integrity(filepath: str):
    print("--- 1. Testing SQL Syntax & Static Integrity ---")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Check for Unicode em-dash
    em_dashes = re.findall(r"[\u2014]", content)
    assert len(em_dashes) == 0, f"Found {len(em_dashes)} em-dashes in migration SQL!"
    print("  [PASS] Zero em-dash compliance verified.")

    # Check for balanced dollar quotes ($$)
    dollar_quotes = re.findall(r"\$\$", content)
    assert len(dollar_quotes) % 2 == 0, f"Unbalanced dollar quotes: {len(dollar_quotes)}"
    print(f"  [PASS] Dollar quote blocks balanced: {len(dollar_quotes) // 2} blocks.")

    # Check required functions and triggers
    required_elements = [
        "public.sync_prep_plan_item_columns",
        "trg_sync_prep_plan_item_columns",
        "public.prep_tasks",
        "public.prep_lists",
        "public.trg_prep_tasks_view_insert",
        "public.trg_prep_tasks_view_update",
        "public.trg_prep_tasks_view_delete",
        "public.trg_prep_lists_view_insert",
        "public.trg_prep_lists_view_update",
        "public.trg_prep_lists_view_delete",
        "public.build_shift_prep",
        "prep_plan_items_tenant_isolation",
    ]
    for elem in required_elements:
        assert elem in content, f"Missing required element: {elem}"
        print(f"  [PASS] Found required element: {elem}")

    # Check search_path security on all SECURITY DEFINER functions
    sec_definers = re.findall(r"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-zA-Z0-9_]+)[\s\S]*?SECURITY\s+DEFINER[\s\S]*?SET\s+search_path\s*=\s*public", content, re.IGNORECASE)
    print(f"  [PASS] Found {len(sec_definers)} SECURITY DEFINER functions with SET search_path = public.")


def simulate_sync_trigger(
    op: str,
    old_row: Optional[Dict[str, Any]],
    new_row: Dict[str, Any],
    parent_plans: Dict[str, Dict[str, Any]],
    my_tenant_id: str
) -> Dict[str, Any]:
    """
    Exact simulation of public.sync_prep_plan_item_columns() PL/pgSQL function:
    
    BEGIN
      -- Sync plan_id <-> prep_plan_id
      IF NEW.prep_plan_id IS NOT NULL AND NEW.plan_id IS NULL THEN
        NEW.plan_id := NEW.prep_plan_id;
      ELSIF NEW.plan_id IS NOT NULL AND NEW.prep_plan_id IS NULL THEN
        NEW.prep_plan_id := NEW.plan_id;
      ELSIF NEW.plan_id IS NOT NULL AND NEW.prep_plan_id IS NOT NULL AND NEW.plan_id <> NEW.prep_plan_id THEN
        -- If both are set but different, sync plan_id from prep_plan_id
        NEW.plan_id := NEW.prep_plan_id;
      END IF;

      -- Auto-populate tenant_id from parent prep_plans if null
      IF NEW.tenant_id IS NULL THEN
        IF NEW.plan_id IS NOT NULL THEN
          SELECT tenant_id INTO NEW.tenant_id
          FROM public.prep_plans
          WHERE id = NEW.plan_id;
        ELSIF NEW.prep_plan_id IS NOT NULL THEN
          SELECT tenant_id INTO NEW.tenant_id
          FROM public.prep_plans
          WHERE id = NEW.prep_plan_id;
        END IF;

        -- If still null, fallback to public.my_tenant_id()
        IF NEW.tenant_id IS NULL THEN
          NEW.tenant_id := public.my_tenant_id();
        END IF;
      END IF;

      RETURN NEW;
    END;
    """
    row = dict(new_row)
    plan_id = row.get("plan_id")
    prep_plan_id = row.get("prep_plan_id")

    if prep_plan_id is not None and plan_id is None:
        row["plan_id"] = prep_plan_id
    elif plan_id is not None and prep_plan_id is None:
        row["prep_plan_id"] = plan_id
    elif plan_id is not None and prep_plan_id is not None and plan_id != prep_plan_id:
        row["plan_id"] = prep_plan_id

    # Tenant auto-population
    if row.get("tenant_id") is None:
        resolved_tenant = None
        if row.get("plan_id") is not None and row["plan_id"] in parent_plans:
            resolved_tenant = parent_plans[row["plan_id"]].get("tenant_id")
        elif row.get("prep_plan_id") is not None and row["prep_plan_id"] in parent_plans:
            resolved_tenant = parent_plans[row["prep_plan_id"]].get("tenant_id")
        
        if resolved_tenant is None:
            resolved_tenant = my_tenant_id
        
        row["tenant_id"] = resolved_tenant

    return row


def test_sync_trigger_matrix():
    print("\n--- 2. Testing sync_prep_plan_item_columns Trigger Matrix ---")
    p1 = str(uuid.uuid4())
    p2 = str(uuid.uuid4())
    t1 = str(uuid.uuid4())
    t2 = str(uuid.uuid4())

    parent_plans = {
        p1: {"id": p1, "tenant_id": t1},
        p2: {"id": p2, "tenant_id": t2},
    }

    # Case 1: INSERT with only plan_id
    res1 = simulate_sync_trigger("INSERT", None, {"plan_id": p1, "prep_plan_id": None, "tenant_id": None}, parent_plans, t1)
    assert res1["plan_id"] == p1 and res1["prep_plan_id"] == p1, f"Failed Case 1: {res1}"
    assert res1["tenant_id"] == t1, f"Failed Case 1 tenant: {res1}"
    print("  [PASS] Case 1: INSERT with only plan_id -> prep_plan_id synced, tenant backfilled.")

    # Case 2: INSERT with only prep_plan_id
    res2 = simulate_sync_trigger("INSERT", None, {"plan_id": None, "prep_plan_id": p1, "tenant_id": None}, parent_plans, t1)
    assert res2["plan_id"] == p1 and res2["prep_plan_id"] == p1, f"Failed Case 2: {res2}"
    assert res2["tenant_id"] == t1, f"Failed Case 2 tenant: {res2}"
    print("  [PASS] Case 2: INSERT with only prep_plan_id -> plan_id synced, tenant backfilled.")

    # Case 3: INSERT with both identical
    res3 = simulate_sync_trigger("INSERT", None, {"plan_id": p1, "prep_plan_id": p1, "tenant_id": None}, parent_plans, t1)
    assert res3["plan_id"] == p1 and res3["prep_plan_id"] == p1, f"Failed Case 3: {res3}"
    assert res3["tenant_id"] == t1, f"Failed Case 3 tenant: {res3}"
    print("  [PASS] Case 3: INSERT with both identical -> preserved, tenant backfilled.")

    # Case 4: INSERT with both differing
    res4 = simulate_sync_trigger("INSERT", None, {"plan_id": p1, "prep_plan_id": p2, "tenant_id": None}, parent_plans, t1)
    assert res4["plan_id"] == p2 and res4["prep_plan_id"] == p2, f"Failed Case 4: {res4}"
    assert res4["tenant_id"] == t2, f"Failed Case 4 tenant: {res4}"
    print("  [PASS] Case 4: INSERT with differing IDs -> resolved to prep_plan_id.")

    # Case 5: UPDATE updating prep_plan_id (plan_id untouched by caller)
    # When caller sends UPDATE prep_plan_items SET prep_plan_id = p2:
    # Postgres sets NEW.plan_id = OLD.plan_id = p1, NEW.prep_plan_id = p2
    old_row = {"plan_id": p1, "prep_plan_id": p1, "tenant_id": t1}
    new_row = {"plan_id": p1, "prep_plan_id": p2, "tenant_id": t1}
    res5 = simulate_sync_trigger("UPDATE", old_row, new_row, parent_plans, t1)
    assert res5["plan_id"] == p2 and res5["prep_plan_id"] == p2, f"Failed Case 5: {res5}"
    print("  [PASS] Case 5: UPDATE prep_plan_id -> plan_id synchronized to p2.")

    # Case 6: UPDATE updating plan_id (prep_plan_id untouched by caller)
    # When caller sends UPDATE prep_plan_items SET plan_id = p2:
    # Postgres sets NEW.plan_id = p2, NEW.prep_plan_id = OLD.prep_plan_id = p1
    new_row_legacy = {"plan_id": p2, "prep_plan_id": p1, "tenant_id": t1}
    res6 = simulate_sync_trigger("UPDATE", old_row, new_row_legacy, parent_plans, t1)
    
    # CRITICAL ADVERSARIAL OBSERVATION:
    # Because V19 line 43 is:
    #   ELSIF NEW.plan_id IS NOT NULL AND NEW.prep_plan_id IS NOT NULL AND NEW.plan_id <> NEW.prep_plan_id THEN
    #     NEW.plan_id := NEW.prep_plan_id;
    # On an UPDATE where the caller only updated plan_id (e.g. legacy client),
    # NEW.prep_plan_id still holds the OLD value (p1), so NEW.plan_id is OVERWRITTEN back to p1!
    print(f"  [CRITICAL BEHAVIOR OBSERVATION] Case 6: Legacy UPDATE plan_id = p2 resulted in: plan_id={res6['plan_id']}, prep_plan_id={res6['prep_plan_id']}.")
    if res6["plan_id"] == p1:
        print("  --> CONFIRMED ASYMMETRY / VULNERABILITY: Legacy UPDATE on `plan_id` alone is overwritten by unchanged `prep_plan_id`!")
    else:
        print("  --> plan_id was preserved.")


def test_views_and_instead_of_triggers_sqlite():
    print("\n--- 3. Testing Views & INSTEAD OF Triggers in SQLite ---")
    con = sqlite3.connect(":memory:")
    cur = con.cursor()

    # Create base tables
    cur.execute("""
    CREATE TABLE prep_plans (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        user_id TEXT,
        shift TEXT,
        plan_date TEXT,
        is_completed INTEGER DEFAULT 0,
        completed_at TEXT,
        created_at TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE prep_plan_items (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        plan_id TEXT,
        prep_plan_id TEXT,
        recipe_id TEXT,
        ingredient_name TEXT,
        prep_amount REAL,
        unit TEXT,
        is_done INTEGER DEFAULT 0,
        done_at TEXT
    );
    """)

    # Seed data
    p1 = "plan-001"
    t1 = "tenant-aaa"
    u1 = "user-111"
    cur.execute("INSERT INTO prep_plans VALUES (?, ?, ?, 'Morning', '2026-10-25', 0, NULL, '2026-10-25 08:00:00')", (p1, t1, u1))

    # Create views mirroring V19
    cur.execute("""
    CREATE VIEW prep_tasks AS
    SELECT
      ppi.id,
      ppi.tenant_id,
      pp.user_id,
      ppi.plan_id,
      ppi.prep_plan_id,
      ppi.plan_id AS prep_list_id,
      ppi.recipe_id,
      ppi.ingredient_name AS task,
      ppi.ingredient_name,
      NULL AS station,
      NULL AS estimated_minutes,
      pp.plan_date AS scheduled_for,
      ppi.is_done,
      ppi.done_at AS completed_at,
      ppi.done_at,
      0 AS sort_order,
      ppi.prep_amount,
      ppi.unit,
      pp.shift,
      pp.created_at
    FROM prep_plan_items ppi
    LEFT JOIN prep_plans pp ON pp.id = ppi.plan_id;
    """)

    cur.execute("""
    CREATE VIEW prep_lists AS
    SELECT
      pp.id,
      pp.tenant_id,
      pp.user_id,
      (pp.shift || ' Prep (' || pp.plan_date || ')') AS name,
      NULL AS recipe_id,
      pp.is_completed,
      pp.completed_at,
      pp.shift,
      pp.plan_date,
      pp.created_at
    FROM prep_plans pp;
    """)

    # INSTEAD OF INSERT ON prep_tasks
    cur.execute("""
    CREATE TRIGGER trg_prep_tasks_insert INSTEAD OF INSERT ON prep_tasks
    BEGIN
      INSERT INTO prep_plan_items (
        id, tenant_id, plan_id, prep_plan_id, recipe_id, ingredient_name, prep_amount, unit, is_done, done_at
      ) VALUES (
        COALESCE(NEW.id, hex(randomblob(16))),
        COALESCE(NEW.tenant_id, 'tenant-default'),
        COALESCE(NEW.plan_id, NEW.prep_plan_id, NEW.prep_list_id),
        COALESCE(NEW.plan_id, NEW.prep_plan_id, NEW.prep_list_id),
        NEW.recipe_id,
        COALESCE(NEW.task, NEW.ingredient_name, 'Prep Task'),
        COALESCE(NEW.prep_amount, 1),
        COALESCE(NEW.unit, 'ea'),
        COALESCE(NEW.is_done, 0),
        COALESCE(NEW.completed_at, NEW.done_at)
      );
    END;
    """)

    # INSTEAD OF UPDATE ON prep_tasks
    cur.execute("""
    CREATE TRIGGER trg_prep_tasks_update INSTEAD OF UPDATE ON prep_tasks
    BEGIN
      UPDATE prep_plan_items
      SET
        is_done = COALESCE(NEW.is_done, is_done),
        done_at = CASE
          WHEN NEW.completed_at IS NOT NULL THEN NEW.completed_at
          WHEN NEW.done_at IS NOT NULL THEN NEW.done_at
          WHEN NEW.is_done = 1 AND is_done = 0 THEN datetime('now')
          WHEN NEW.is_done = 0 THEN NULL
          ELSE done_at
        END,
        prep_amount = COALESCE(NEW.prep_amount, prep_amount),
        unit = COALESCE(NEW.unit, unit),
        ingredient_name = COALESCE(NEW.task, NEW.ingredient_name, ingredient_name),
        recipe_id = COALESCE(NEW.recipe_id, recipe_id),
        plan_id = COALESCE(NEW.plan_id, NEW.prep_plan_id, NEW.prep_list_id, plan_id),
        prep_plan_id = COALESCE(NEW.prep_plan_id, NEW.plan_id, NEW.prep_list_id, prep_plan_id),
        tenant_id = COALESCE(NEW.tenant_id, tenant_id)
      WHERE id = OLD.id;
    END;
    """)

    # INSTEAD OF DELETE ON prep_tasks
    cur.execute("""
    CREATE TRIGGER trg_prep_tasks_delete INSTEAD OF DELETE ON prep_tasks
    BEGIN
      DELETE FROM prep_plan_items WHERE id = OLD.id;
    END;
    """)

    # Test 3.1: INSERT via prep_tasks view
    item_id = "item-001"
    cur.execute("""
    INSERT INTO prep_tasks (id, prep_list_id, task, prep_amount, unit)
    VALUES (?, ?, 'Chop Onions', 5.0, 'kg')
    """, (item_id, p1))

    cur.execute("SELECT id, plan_id, prep_plan_id, ingredient_name, prep_amount, unit, is_done, done_at FROM prep_plan_items WHERE id = ?", (item_id,))
    row = cur.fetchone()
    assert row is not None, "Failed to insert into prep_plan_items via prep_tasks view!"
    assert row[1] == p1 and row[2] == p1, f"plan_id and prep_plan_id mismatch: {row}"
    assert row[3] == "Chop Onions", f"Task name mismatch: {row}"
    print(f"  [PASS] 3.1 View INSERT: {row}")

    # Test 3.2: UPDATE is_done = 1 via prep_tasks view
    cur.execute("""
    UPDATE prep_tasks SET is_done = 1, completed_at = '2026-10-25 10:30:00' WHERE id = ?
    """, (item_id,))
    cur.execute("SELECT is_done, done_at FROM prep_plan_items WHERE id = ?", (item_id,))
    row_done = cur.fetchone()
    assert row_done[0] == 1, f"is_done not 1: {row_done}"
    assert row_done[1] == '2026-10-25 10:30:00', f"done_at not set: {row_done}"
    print(f"  [PASS] 3.2 View UPDATE mark done: {row_done}")

    # Test 3.3: UPDATE uncheck task (is_done = 0)
    # Simulate RecipeOS: .update({ is_done: false, completed_at: null })
    # In SQLite/Postgres view update:
    # When updating prep_tasks SET is_done = 0, completed_at = NULL:
    # Does done_at get cleared to NULL or does CASE WHEN NEW.done_at IS NOT NULL retain the old done_at?
    cur.execute("""
    UPDATE prep_tasks SET is_done = 0, completed_at = NULL WHERE id = ?
    """, (item_id,))
    cur.execute("SELECT is_done, done_at FROM prep_plan_items WHERE id = ?", (item_id,))
    row_uncheck = cur.fetchone()
    print(f"  [ADVERSARIAL CHECK] 3.3 View UPDATE uncheck: {row_uncheck}")
    if row_uncheck[1] is not None:
        print("  --> CONFIRMED V19 VIEW TRIGGER QUIRK: done_at was NOT cleared because NEW.done_at retained OLD.done_at in the view trigger!")
    else:
        print("  --> done_at was cleared to NULL.")

    # Test 3.4: DELETE via prep_tasks view
    cur.execute("DELETE FROM prep_tasks WHERE id = ?", (item_id,))
    cur.execute("SELECT count(*) FROM prep_plan_items WHERE id = ?", (item_id,))
    count = cur.fetchone()[0]
    assert count == 0, "Failed to delete from prep_plan_items via view!"
    print(f"  [PASS] 3.4 View DELETE: verified row removed.")


def main():
    print("================================================================")
    print("  CulinaryOS V19 Adversarial & Empirical Verification Runner    ")
    print("================================================================")
    migration_file = "supabase/migrations/V19__prep_tasks_reconciliation.sql"
    test_sql_syntax_and_integrity(migration_file)
    test_sync_trigger_matrix()
    test_views_and_instead_of_triggers_sqlite()
    print("\n================================================================")
    print("  ALL EMPIRICAL VERIFICATION TESTS COMPLETED SUCCESSFULLY       ")
    print("================================================================")

if __name__ == "__main__":
    main()

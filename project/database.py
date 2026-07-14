"""
database.py
Sets up SQLite DB, loads electricity data, and exposes SQL query helpers.
"""
import sqlite3
import pandas as pd
import os
from generate_data import generate_dataset

DB_PATH = "electricity.db"

# ─── Schema ─────────────────────────────────────────────────────────────────
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS electricity_consumption (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    state           TEXT    NOT NULL,
    region          TEXT    NOT NULL,
    year            INTEGER NOT NULL,
    month           INTEGER NOT NULL,
    month_name      TEXT    NOT NULL,
    period          TEXT    NOT NULL,
    consumption_mu  REAL    NOT NULL
);
"""

# ─── Calculated view: YoY change, recovery index ────────────────────────────
CREATE_VIEW_SQL = """
CREATE VIEW IF NOT EXISTS v_yoy_change AS
SELECT
    a.state,
    a.region,
    a.month,
    a.month_name,
    a.consumption_mu AS consumption_2020,
    b.consumption_mu AS consumption_2019,
    ROUND(((a.consumption_mu - b.consumption_mu) / b.consumption_mu) * 100, 2) AS yoy_change_pct,
    ROUND(a.consumption_mu / b.consumption_mu * 100, 2) AS recovery_index
FROM electricity_consumption a
JOIN electricity_consumption b
    ON a.state = b.state AND a.month = b.month
WHERE a.year = 2020 AND b.year = 2019;
"""

def get_connection():
    return sqlite3.connect(DB_PATH)

def init_db():
    """Create DB, tables, views and seed data."""
    # Generate CSV if missing
    if not os.path.exists("data/electricity_data.csv"):
        print("Generating synthetic dataset...")
        generate_dataset()

    df = pd.read_csv("data/electricity_data.csv")

    conn = get_connection()
    cur = conn.cursor()

    # Create table
    cur.execute(CREATE_TABLE_SQL)

    # Seed only if empty
    cur.execute("SELECT COUNT(*) FROM electricity_consumption")
    if cur.fetchone()[0] == 0:
        df.to_sql("electricity_consumption", conn, if_exists="append", index=False)
        print(f"[OK] Inserted {len(df)} rows into electricity_consumption")
    else:
        print("[INFO] DB already seeded.")

    # Create computed view
    cur.execute(CREATE_VIEW_SQL)
    conn.commit()
    conn.close()
    print("[OK] Database initialized.")

# ─── Query helpers (used by Flask routes) ───────────────────────────────────

def query_national_trends():
    """Monthly national totals for Jan 2019 – Dec 2020."""
    sql = """
    SELECT year, month, month_name, period,
           ROUND(SUM(consumption_mu), 2) AS total_mu
    FROM electricity_consumption
    GROUP BY year, month
    ORDER BY year, month;
    """
    conn = get_connection()
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df.to_dict(orient="records")


def query_regional_breakdown():
    """Total consumption per region per year."""
    sql = """
    SELECT region, year,
           ROUND(SUM(consumption_mu), 2) AS total_mu,
           ROUND(AVG(consumption_mu), 2) AS avg_mu
    FROM electricity_consumption
    GROUP BY region, year
    ORDER BY year, total_mu DESC;
    """
    conn = get_connection()
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df.to_dict(orient="records")


def query_state_consumption(state=None, region=None, year=None):
    """State-wise total consumption with optional filters."""
    conditions = []
    params = []
    if state:
        conditions.append("state = ?")
        params.append(state)
    if region:
        conditions.append("region = ?")
        params.append(region)
    if year:
        conditions.append("year = ?")
        params.append(year)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    sql = f"""
    SELECT state, region, year, month, month_name, period, consumption_mu
    FROM electricity_consumption
    {where}
    ORDER BY state, year, month;
    """
    conn = get_connection()
    df = pd.read_sql_query(sql, conn, params=params if params else None)
    conn.close()
    return df.to_dict(orient="records")


def query_recovery_analysis():
    """State-wise recovery index post lockdown (2020 vs 2019)."""
    sql = """
    SELECT state, region, month, month_name,
           consumption_2020, consumption_2019,
           yoy_change_pct, recovery_index
    FROM v_yoy_change
    ORDER BY month, state;
    """
    conn = get_connection()
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df.to_dict(orient="records")


def query_lockdown_comparison():
    """Pre-lockdown, during-lockdown, post-lockdown averages per state."""
    sql = """
    SELECT state, region,
        ROUND(AVG(CASE WHEN year=2019 THEN consumption_mu END), 2)           AS avg_2019,
        ROUND(AVG(CASE WHEN year=2020 AND month IN (3,4,5,6) THEN consumption_mu END), 2) AS avg_lockdown,
        ROUND(AVG(CASE WHEN year=2020 AND month IN (7,8,9,10,11,12) THEN consumption_mu END), 2) AS avg_recovery
    FROM electricity_consumption
    GROUP BY state, region
    ORDER BY avg_2019 DESC;
    """
    conn = get_connection()
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df.to_dict(orient="records")


def query_heatmap():
    """Month x State consumption matrix for 2020 heatmap."""
    sql = """
    SELECT state, month, month_name, year,
           ROUND(consumption_mu, 2) AS consumption_mu
    FROM electricity_consumption
    ORDER BY state, year, month;
    """
    conn = get_connection()
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df.to_dict(orient="records")


def query_performance_stats():
    """DB statistics for performance metrics page."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM electricity_consumption")
    total_rows = cur.fetchone()[0]

    cur.execute("SELECT COUNT(DISTINCT state) FROM electricity_consumption")
    total_states = cur.fetchone()[0]

    cur.execute("SELECT COUNT(DISTINCT region) FROM electricity_consumption")
    total_regions = cur.fetchone()[0]

    cur.execute("SELECT MIN(period), MAX(period) FROM electricity_consumption")
    date_range = cur.fetchone()

    cur.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
    tables = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='view'")
    views = cur.fetchone()[0]

    conn.close()
    return {
        "total_rows": total_rows,
        "total_states": total_states,
        "total_regions": total_regions,
        "date_range": f"{date_range[0]} – {date_range[1]}",
        "tables": tables,
        "views": views,
        "calculation_fields": 5,  # yoy_change_pct, recovery_index, avg_lockdown, avg_recovery, regional_share
        "visualizations": 6,
        "story_scenes": 5,
        "filter_types": 4,  # state, region, year, month-range
    }


def get_filter_options():
    """Return available filter values."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT state FROM electricity_consumption ORDER BY state")
    states = [r[0] for r in cur.fetchall()]
    cur.execute("SELECT DISTINCT region FROM electricity_consumption ORDER BY region")
    regions = [r[0] for r in cur.fetchall()]
    conn.close()
    return {"states": states, "regions": regions, "years": [2019, 2020]}


if __name__ == "__main__":
    init_db()

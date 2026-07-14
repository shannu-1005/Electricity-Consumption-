"""
app.py — Flask entry point for India Electricity Consumption Analysis
"""
from flask import Flask, render_template, jsonify, request
from database import (
    init_db,
    query_national_trends,
    query_regional_breakdown,
    query_state_consumption,
    query_recovery_analysis,
    query_lockdown_comparison,
    query_heatmap,
    query_performance_stats,
    get_filter_options,
)

app = Flask(__name__)

# ─── Initialize DB on startup ────────────────────────────────────────────────
with app.app_context():
    init_db()

# ═══════════════════════════════════════════════════════════════════════════════
# PAGE ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route("/story")
def story():
    return render_template("story.html")

# ═══════════════════════════════════════════════════════════════════════════════
# API ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/trends")
def api_trends():
    """Scenario 1 – National monthly consumption Jan 2019–Dec 2020."""
    return jsonify(query_national_trends())

@app.route("/api/regions")
def api_regions():
    """Scenario 2 – Regional breakdown by year."""
    return jsonify(query_regional_breakdown())

@app.route("/api/recovery")
def api_recovery():
    """Scenario 3 – State-wise recovery index (YoY comparison)."""
    return jsonify(query_recovery_analysis())

@app.route("/api/states")
def api_states():
    """All state data with optional filters: ?state=X&region=Y&year=Z"""
    state = request.args.get("state")
    region = request.args.get("region")
    year = request.args.get("year", type=int)
    return jsonify(query_state_consumption(state=state, region=region, year=year))

@app.route("/api/lockdown")
def api_lockdown():
    """Pre / During / Post lockdown comparison per state."""
    return jsonify(query_lockdown_comparison())

@app.route("/api/heatmap")
def api_heatmap():
    """Month × State consumption matrix."""
    return jsonify(query_heatmap())

@app.route("/api/performance")
def api_performance():
    """Performance metrics – DB stats, filter counts, calculation fields."""
    return jsonify(query_performance_stats())

@app.route("/api/filters")
def api_filters():
    """Available filter options for dropdowns."""
    return jsonify(get_filter_options())

# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    app.run(debug=True, port=5000)

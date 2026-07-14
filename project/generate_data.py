"""
generate_data.py
Generates a realistic synthetic dataset for India's electricity consumption
from January 2019 to December 2020 for all major states.
"""
import pandas as pd
import numpy as np
import os

# ─── State configuration ────────────────────────────────────────────────────
STATES = {
    # state: (region, base_monthly_mu, summer_boost, winter_boost)
    # Northern Region
    "Delhi":               ("Northern", 2200, 0.30, 0.10),
    "Haryana":             ("Northern", 3800, 0.28, 0.12),
    "Himachal Pradesh":    ("Northern",  700, 0.10, 0.20),
    "Jammu & Kashmir":     ("Northern",  900, 0.08, 0.25),
    "Punjab":              ("Northern", 4200, 0.30, 0.05),
    "Rajasthan":           ("Northern", 7000, 0.35, 0.08),
    "Uttar Pradesh":       ("Northern", 10500, 0.28, 0.10),
    "Uttarakhand":         ("Northern",  1100, 0.12, 0.15),
    # Southern Region
    "Andhra Pradesh":      ("Southern", 7200, 0.25, -0.05),
    "Karnataka":           ("Southern", 7800, 0.20, -0.05),
    "Kerala":              ("Southern", 3200, 0.10, 0.05),
    "Tamil Nadu":          ("Southern", 10200, 0.22, 0.00),
    "Telangana":           ("Southern", 6800, 0.28, -0.02),
    # Eastern Region
    "Bihar":               ("Eastern", 2600, 0.20, 0.08),
    "Jharkhand":           ("Eastern", 2100, 0.15, 0.10),
    "Odisha":              ("Eastern", 3800, 0.18, 0.05),
    "West Bengal":         ("Eastern", 6200, 0.20, 0.08),
    # Western Region
    "Chhattisgarh":        ("Western", 3200, 0.18, 0.08),
    "Goa":                 ("Western",  420, 0.15, 0.00),
    "Gujarat":             ("Western", 10000, 0.25, 0.05),
    "Madhya Pradesh":      ("Western", 7200, 0.25, 0.10),
    "Maharashtra":         ("Western", 13000, 0.22, 0.05),
    # Northeastern Region
    "Arunachal Pradesh":   ("Northeastern",  130, 0.05, 0.15),
    "Assam":               ("Northeastern", 1100, 0.12, 0.10),
    "Manipur":             ("Northeastern",  130, 0.08, 0.12),
    "Meghalaya":           ("Northeastern",  200, 0.08, 0.15),
    "Mizoram":             ("Northeastern",   90, 0.05, 0.15),
    "Nagaland":            ("Northeastern",  110, 0.06, 0.14),
    "Sikkim":              ("Northeastern",   90, 0.05, 0.18),
    "Tripura":             ("Northeastern",  280, 0.10, 0.10),
}

# Month index seasonal multipliers (Jan=1 … Dec=12)
# Represents base seasonal shape — higher in summer (Apr-Jun), moderate in winter (Nov-Jan)
MONTH_SEASONAL = {
    1: 0.92,  # Jan - cold, moderate
    2: 0.90,  # Feb - cold
    3: 1.00,  # Mar - shoulder
    4: 1.12,  # Apr - summer starts
    5: 1.20,  # May - peak summer
    6: 1.15,  # Jun - pre-monsoon
    7: 1.05,  # Jul - monsoon
    8: 1.02,  # Aug - monsoon
    9: 0.98,  # Sep - post-monsoon
    10: 0.95, # Oct - autumn
    11: 0.93, # Nov - winter
    12: 0.94, # Dec - winter
}

# COVID-19 lockdown suppression multipliers (applied to 2020 months)
COVID_IMPACT = {
    1: 1.00,  # Jan 2020 - normal
    2: 1.00,  # Feb 2020 - normal
    3: 0.88,  # Mar 2020 - partial lockdown (last week)
    4: 0.62,  # Apr 2020 - full lockdown Phase 1 & 2
    5: 0.68,  # May 2020 - lockdown Phase 3 & 4
    6: 0.78,  # Jun 2020 - unlock 1.0
    7: 0.88,  # Jul 2020 - unlock 2.0
    8: 0.92,  # Aug 2020 - unlock 3.0
    9: 0.95,  # Sep 2020 - unlock 4.0
    10: 0.97, # Oct 2020 - near normal
    11: 0.98, # Nov 2020 - near normal
    12: 1.00, # Dec 2020 - recovered
}

# State-specific COVID sensitivity (industrial states hit harder)
COVID_SENSITIVITY = {
    "Maharashtra": 1.20, "Gujarat": 1.18, "Tamil Nadu": 1.15, "Karnataka": 1.12,
    "Delhi": 1.10, "Telangana": 1.08, "Andhra Pradesh": 1.05, "Punjab": 1.06,
    "West Bengal": 1.08, "Rajasthan": 1.05, "Uttar Pradesh": 1.04, "Haryana": 1.07,
    "Madhya Pradesh": 1.04, "Odisha": 1.06, "Jharkhand": 1.05, "Chhattisgarh": 1.06,
    "Bihar": 1.02, "Kerala": 1.03, "Himachal Pradesh": 0.98, "Uttarakhand": 1.00,
    "Goa": 1.10, "Jammu & Kashmir": 0.95, "Assam": 1.00, "Meghalaya": 0.98,
    "Arunachal Pradesh": 0.95, "Manipur": 0.95, "Mizoram": 0.95,
    "Nagaland": 0.95, "Sikkim": 0.95, "Tripura": 0.98,
}

# Growth trend: 2020 vs 2019 baseline (annual growth ~4-5%)
ANNUAL_GROWTH = 0.042

def generate_dataset():
    rows = []
    rng = np.random.default_rng(42)

    months = [(y, m) for y in [2019, 2020] for m in range(1, 13)]

    for state, (region, base_mu, summer_boost, winter_boost) in STATES.items():
        for year, month in months:
            # Seasonal factor
            seasonal = MONTH_SEASONAL[month]
            # Apply state-specific seasonal shape
            if month in [4, 5, 6]:  # summer
                seasonal = seasonal * (1 + summer_boost * 0.5)
            elif month in [11, 12, 1, 2]:  # winter
                seasonal = seasonal * (1 + winter_boost * 0.3)

            # Annual growth for 2020
            growth = 1 + ANNUAL_GROWTH if year == 2020 else 1.0

            # COVID suppression for 2020
            covid = 1.0
            if year == 2020:
                base_covid = COVID_IMPACT[month]
                sensitivity = COVID_SENSITIVITY.get(state, 1.0)
                # COVID suppression: amplified for sensitive states
                suppression = 1 - (1 - base_covid) * sensitivity
                covid = suppression

            # Small random noise ±3%
            noise = rng.uniform(0.97, 1.03)

            consumption = round(base_mu * seasonal * growth * covid * noise, 2)

            rows.append({
                "state": state,
                "region": region,
                "year": year,
                "month": month,
                "month_name": pd.Timestamp(year=year, month=month, day=1).strftime("%b"),
                "period": f"{pd.Timestamp(year=year, month=month, day=1).strftime('%b-%Y')}",
                "consumption_mu": consumption,
            })

    df = pd.DataFrame(rows)
    os.makedirs("data", exist_ok=True)
    df.to_csv("data/electricity_data.csv", index=False)
    print(f"[OK] Dataset generated: {len(df)} rows -> data/electricity_data.csv")
    return df

if __name__ == "__main__":
    generate_dataset()

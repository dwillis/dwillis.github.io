"""Append common columns from logs11.csv through logs26.csv into a single CSV."""
import pandas as pd

files = [f"logs{year}.csv" for year in range(11, 27)]

# Find the intersection of columns across all files
common_cols = None
for f in files:
    cols = set(pd.read_csv(f, nrows=0).columns)
    common_cols = cols if common_cols is None else common_cols & cols

# Preserve the column order from the first file
first_order = list(pd.read_csv(files[0], nrows=0).columns)
ordered_common = [c for c in first_order if c in common_cols]

# Read each file (only common columns) and concatenate
frames = [pd.read_csv(f, usecols=ordered_common) for f in files]
combined = pd.concat(frames, ignore_index=True)[ordered_common]

combined.to_csv("logs_combined.csv", index=False)
print(f"Wrote {len(combined)} rows and {len(ordered_common)} columns to logs_combined.csv")

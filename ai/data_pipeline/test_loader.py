"""Test suite for LIFE-ROUTE DatasetLoader.

Validates loading of organizer-provided datasets from dataset/raw/.
Adheres strictly to zero-synthetic data policy: never generates dummy records.
"""

import sys
from typing import Dict, List
from ai.data_pipeline.loader import DatasetLoader, DatasetInfo


def run_loader_test() -> bool:
    """Execute validation of the DatasetLoader against organizer datasets."""
    print("=" * 70)
    print("LIFE-ROUTE: Step 1 Data Ingestion Validation")
    print("=" * 70)

    loader = DatasetLoader()
    print(f"Raw data directory resolved to: {loader.raw_dir}\n")

    # -------------------------------------------------------------
    # 1. Test loading traffic_train.csv
    # -------------------------------------------------------------
    target_file = "traffic_train.csv"
    print(f"--> [Step 1.1] Checking target file: '{target_file}'")

    if loader.file_exists(target_file):
        try:
            df = loader.load_dataset(target_file)
            info = loader.get_dataset_info(df, target_file)

            print(f"\n[SUCCESS] Loaded '{target_file}'")
            print(f"- Dataset Name    : {info.filename}")
            print(f"- Number of Rows  : {info.row_count}")
            print(f"- Number of Columns: {info.column_count}")
            print(f"- Column Names    : {info.column_names}")
            print("\nPandas Data Types:")
            for col, dtype in info.dtypes.items():
                print(f"  * {col}: {dtype}")
            print("\nFirst 5 Rows:")
            print(df.head(5))
        except Exception as exc:
            print(f"\n[ERROR] Failed to load '{target_file}': {exc}")
    else:
        print(f"[MISSING] '{target_file}' is not present in '{loader.raw_dir}'.")
        print("Notice: As per zero-fake-data policy, no synthetic data was generated.")

    # -------------------------------------------------------------
    # 2. Test loading complete organizer dataset list
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("--> [Step 1.2] Testing all expected organizer datasets...")
    print("-" * 70)

    loaded, missing, failed = loader.load_all_expected()

    print(f"\nSummary of Organizer Datasets ({len(loader.EXPECTED_DATASETS)} expected):")
    print(f"- Successfully loaded: {len(loaded)}")
    print(f"- Missing files       : {len(missing)}")
    print(f"- Failed to load      : {len(failed)}")

    if loaded:
        print("\nSuccessfully loaded datasets:")
        for name, df in loaded.items():
            print(f"  ✓ {name} ({len(df)} rows, {len(df.columns)} columns)")

    if missing:
        print("\nMissing organizer datasets:")
        for name in missing:
            print(f"  ✗ {name}")

    if failed:
        print("\nDatasets that encountered loading errors:")
        for name, err in failed.items():
            print(f"  ! {name}: {err}")

    print("\n" + "=" * 70)
    print("Data Ingestion Scaffolding Test Complete.")
    print("=" * 70)

    # Loader logic itself functioned properly (no uncaught exceptions)
    return len(failed) == 0


if __name__ == "__main__":
    success = run_loader_test()
    sys.exit(0 if success else 1)

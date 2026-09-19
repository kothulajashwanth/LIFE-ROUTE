"""Test runner for LIFE-ROUTE Data Quality Engine.

Executes non-destructive audit on real organizer datasets,
exports JSON & Markdown reports, and displays terminal summary.
"""

import sys
import time
from ai.data_pipeline.loader import DatasetLoader
from ai.data_pipeline.quality import DataQualityEngine


def run_quality_test() -> bool:
    """Run full data quality audit pipeline on organizer datasets."""
    start_time = time.time()
    print("=" * 75)
    print("🚦 LIFE-ROUTE: Step 2 Data Quality Audit Execution")
    print("=" * 75)

    # 1. Initialize Loader & Load Datasets
    print("\n[1/4] Loading organizer datasets from dataset/raw/...")
    loader = DatasetLoader()
    loaded_datasets, missing, failed = loader.load_all_expected()

    print(f"      Successfully loaded : {len(loaded_datasets)} datasets")
    if missing:
        print(f"      Missing datasets    : {len(missing)} ({missing})")
    if failed:
        print(f"      Failed to load       : {len(failed)} ({failed})")

    if not loaded_datasets:
        print("\n[ERROR] No datasets could be loaded. Aborting quality audit.")
        return False

    # 2. Run Quality Engine
    print("\n[2/4] Running DataQualityEngine validation suite...")
    engine = DataQualityEngine(loader=loader)
    results, cross_issues = engine.run_full_quality_audit(loaded_datasets=loaded_datasets)

    # 3. Export Reports
    print("\n[3/4] Exporting JSON and Markdown quality reports to dataset/processed/...")
    json_path, md_path = engine.export_reports(results, cross_issues)
    print(f"      JSON Report : {json_path}")
    print(f"      MD Report   : {md_path}")

    # 4. Compute Aggregate Statistics for Summary
    total_checked = len(results)
    passed_count = sum(1 for r in results.values() if r.status == "PASS")
    warning_count = sum(1 for r in results.values() if r.status == "WARNING")
    failed_count = sum(1 for r in results.values() if r.status == "FAIL")

    total_missing = sum(r.total_missing for r in results.values())
    total_duplicates = sum(r.duplicates_count for r in results.values())

    timestamp_problems = sum(
        r.timestamp_info.get("invalid_timestamp_count", 0)
        for r in results.values()
        if r.timestamp_info
    )

    invalid_numeric_values = sum(
        sum(item.get("pos_inf_count", 0) + item.get("neg_inf_count", 0) for item in r.numeric_issues.values())
        for r in results.values()
    )

    range_violations = sum(
        sum(item.get("invalid_count", 0) for item in r.range_violations.values())
        for r in results.values()
    )

    suspicious_outliers_spikes = sum(
        sum(r.outliers_and_spikes.values()) for r in results.values()
    )

    stuck_sensor_findings = sum(
        sum(r.stuck_sensors.values()) for r in results.values()
    )

    total_cross_reference_issues = sum(
        sum(issues.values()) for issues in cross_issues.values()
    )

    elapsed = time.time() - start_time

    # 5. Print Concise Terminal Summary
    print("\n" + "=" * 75)
    print("📊 DATA QUALITY AUDIT SUMMARY")
    print("=" * 75)
    print(f"  • Datasets Checked                  : {total_checked}")
    print(f"  • Datasets Passed (PASS)             : {passed_count}")
    print(f"  • Datasets with Warnings (WARNING)   : {warning_count}")
    print(f"  • Datasets Failed (FAIL)             : {failed_count}")
    print("  " + "-" * 50)
    print(f"  • Total Missing Values               : {total_missing}")
    print(f"  • Duplicate Findings                 : {total_duplicates}")
    print(f"  • Timestamp Problems                 : {timestamp_problems}")
    print(f"  • Invalid Numeric Values (+/- inf)   : {invalid_numeric_values}")
    print(f"  • Range Violations (Physically Imp.) : {range_violations}")
    print(f"  • Suspicious Outlier/Spike Findings  : {suspicious_outliers_spikes}")
    print(f"  • Stuck Sensor Streak Findings       : {stuck_sensor_findings}")
    print(f"  • Cross-Dataset Reference Problems   : {total_cross_reference_issues}")
    print("=" * 75)
    print(f"⏱️  Completed in {elapsed:.2f} seconds.")
    print("🛡️  Zero modifications made to dataset/raw/. Raw datasets remain untouched.")
    print("=" * 75 + "\n")

    return True


if __name__ == "__main__":
    success = run_quality_test()
    sys.exit(0 if success else 1)

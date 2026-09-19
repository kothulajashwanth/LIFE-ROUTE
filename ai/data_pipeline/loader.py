"""Data Ingestion layer for LIFE-ROUTE.

Loads organizer-provided datasets from dataset/raw/ without modifying,
synthesizing, or mutating raw data.
"""

from dataclasses import dataclass
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from dotenv import load_dotenv
import pandas as pd

# Load environment variables from .env
load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class DatasetInfo:
    """Metadata summary of a loaded dataset."""

    filename: str
    row_count: int
    column_count: int
    column_names: List[str]
    dtypes: Dict[str, str]

    def to_dict(self) -> Dict[str, Any]:
        """Convert metadata to dictionary representation."""
        return {
            "filename": self.filename,
            "row_count": self.row_count,
            "column_count": self.column_count,
            "column_names": self.column_names,
            "dtypes": self.dtypes,
        }


class DatasetLoader:
    """Reusable loader for organizer-provided traffic and network datasets."""

    # Full list of expected organizer datasets
    EXPECTED_DATASETS: List[str] = [
        "traffic_train.csv",
        "traffic_validation.csv",
        "forecast_targets_train.csv",
        "forecast_targets_validation.csv",
        "incidents_train.csv",
        "incidents_validation.csv",
        "context_train.csv",
        "context_validation.csv",
        "roadworks_train.csv",
        "roadworks_validation.csv",
        "network.csv",
        "nodes.csv",
        "signal_plans.csv",
        "turn_restrictions.csv",
        "od_demand_profiles.csv",
        "planning_candidates.csv",
        "scenario_examples.csv",
    ]

    def __init__(
        self,
        data_dir: Optional[Union[str, Path]] = None,
        raw_subdir: str = "raw",
    ) -> None:
        """Initialize loader with configurable dataset path.

        Resolves path from passed argument, or DATA_DIR from environment (.env),
        defaulting to './dataset'. Files are loaded from <data_dir>/raw/.

        Args:
            data_dir: Optional path to the dataset directory.
            raw_subdir: Subdirectory name where raw CSVs reside (default: 'raw').
        """
        if data_dir is None:
            data_dir = os.getenv("DATA_DIR", "./dataset")

        base_path = Path(data_dir)
        # If passed path already points to raw directory, resolve directly; otherwise append raw_subdir
        if base_path.name == raw_subdir:
            self.raw_dir = base_path.resolve()
        else:
            self.raw_dir = (base_path / raw_subdir).resolve()

    def get_file_path(self, filename: str) -> Path:
        """Get the absolute path for a filename inside the raw dataset directory."""
        return self.raw_dir / filename

    def file_exists(self, filename: str) -> bool:
        """Check if a dataset file exists inside the raw dataset directory."""
        path = self.get_file_path(filename)
        return path.is_file()

    def get_dataset_info(self, df: pd.DataFrame, filename: str) -> DatasetInfo:
        """Extract metadata about a loaded dataset.

        Args:
            df: The loaded pandas DataFrame.
            filename: Name of the file.

        Returns:
            DatasetInfo object containing summary metadata.
        """
        return DatasetInfo(
            filename=filename,
            row_count=len(df),
            column_count=len(df.columns),
            column_names=list(df.columns),
            dtypes={col: str(dtype) for col, dtype in df.dtypes.items()},
        )

    def load_dataset(self, filename: str, **kwargs: Any) -> pd.DataFrame:
        """Load a specific CSV dataset from the raw directory.

        Args:
            filename: Name of the CSV file (e.g. 'traffic_train.csv')
            **kwargs: Optional keyword arguments forwarded to pd.read_csv.

        Returns:
            pd.DataFrame containing the raw data.

        Raises:
            ValueError: If the file is not a CSV.
            FileNotFoundError: If the file does not exist.
            RuntimeError: If pandas fails to read/parse the CSV.
        """
        if not filename.endswith(".csv"):
            raise ValueError(f"Invalid file format: '{filename}'. Expected a .csv file.")

        file_path = self.get_file_path(filename)
        if not file_path.is_file():
            raise FileNotFoundError(
                f"Organizer dataset '{filename}' was not found at '{file_path}'. "
                f"Please ensure the file is present in '{self.raw_dir}'."
            )

        try:
            df = pd.read_csv(file_path, **kwargs)
            logger.info("Loaded '%s': %d rows, %d columns", filename, len(df), len(df.columns))
            return df
        except Exception as exc:
            raise RuntimeError(f"Failed to read CSV '{filename}': {exc}") from exc

    def load_all_expected(
        self,
    ) -> Tuple[Dict[str, pd.DataFrame], List[str], Dict[str, str]]:
        """Attempt to load all expected organizer datasets.

        Returns:
            Tuple of:
            - loaded: Dict mapping filename -> DataFrame for successfully loaded datasets
            - missing: List of filenames that do not exist in dataset/raw/
            - failed: Dict mapping filename -> error description for files that failed loading
        """
        loaded: Dict[str, pd.DataFrame] = {}
        missing: List[str] = []
        failed: Dict[str, str] = {}

        for filename in self.EXPECTED_DATASETS:
            if not self.file_exists(filename):
                missing.append(filename)
            else:
                try:
                    df = self.load_dataset(filename)
                    loaded[filename] = df
                except Exception as exc:
                    failed[filename] = str(exc)

        return loaded, missing, failed

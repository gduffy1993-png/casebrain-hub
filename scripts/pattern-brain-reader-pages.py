"""Turn a practice PDF into column-aware page text. Lab only."""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from python_runtime.schedule_chase_column_reader import column_pages_from_path


print(json.dumps(column_pages_from_path(sys.argv[1])))

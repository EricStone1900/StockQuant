import json
import os
from pathlib import Path

import qlib
import rdagent


assert os.environ.get("DEEPSEEK_API_KEY") is None
assert os.environ.get("SILICONFLOW_API_KEY") is None
assert not Path("/var/run/docker.sock").exists()
Path(os.environ["STOCKQUANT_OUTPUT_DIR"], "smoke.json").write_text(
    json.dumps({"qlib": qlib.__version__, "rdagent": str(rdagent.__file__)}, sort_keys=True),
    encoding="utf-8",
)

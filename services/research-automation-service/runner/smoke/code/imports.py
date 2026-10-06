import json
import os
import socket
from importlib.metadata import version
from pathlib import Path

import qlib
import rdagent
import litellm
import openai
from rdagent.oai.llm_conf import LLM_SETTINGS
from rdagent.oai.backend.litellm import LITELLM_SETTINGS


assert os.environ.get("LITELLM_LOCAL_MODEL_COST_MAP", "").lower() == "true"
assert not LLM_SETTINGS.log_llm_chat_content
assert LLM_SETTINGS.max_retry == 1
assert not LLM_SETTINGS.use_chat_cache and not LLM_SETTINGS.use_embedding_cache
assert not LLM_SETTINGS.dump_chat_cache and not LLM_SETTINGS.dump_embedding_cache
assert not LLM_SETTINGS.chat_stream
assert not LITELLM_SETTINGS.log_llm_chat_content
assert LITELLM_SETTINGS.max_retry == 1
assert not LITELLM_SETTINGS.use_chat_cache and not LITELLM_SETTINGS.use_embedding_cache
assert not LITELLM_SETTINGS.dump_chat_cache and not LITELLM_SETTINGS.dump_embedding_cache
assert not LITELLM_SETTINGS.chat_stream
assert os.environ.get("DEEPSEEK_API_KEY") is None
assert os.environ.get("SILICONFLOW_API_KEY") is None
assert not Path("/var/run/docker.sock").exists()
try:
    socket.create_connection(("example.com", 80), timeout=1)
except OSError:
    pass
else:
    raise AssertionError("network policy was not enforced")
Path(os.environ["STOCKQUANT_OUTPUT_DIR"], "smoke.json").write_text(
    json.dumps({
        "qlib": qlib.__version__,
        "rdagent": version("rdagent"),
        "litellm": version("litellm"),
        "openai": version("openai"),
        "rdagent_path": str(rdagent.__file__),
        "litellm_path": str(litellm.__file__),
        "openai_path": str(openai.__file__),
    }, sort_keys=True),
    encoding="utf-8",
)

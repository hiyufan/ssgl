import pathlib
import sys

# Ensure `ai-service/` is on sys.path so `import app...` resolves
# regardless of the directory pytest is invoked from.
sys.path.insert(0, str(pathlib.Path(__file__).parent))

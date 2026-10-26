import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "app"


def test_main_is_only_an_asgi_entrypoint():
    tree = ast.parse((ROOT / "main.py").read_text())
    assert not any(
        isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) for node in tree.body
    ), "Route and service implementation belong outside main.py"


def test_business_layers_have_no_fastapi_dependency():
    for layer in ["models", "repositories", "services"]:
        directory = ROOT / layer
        assert directory.is_dir(), f"{layer} layer must exist"
        for path in directory.glob("*.py"):
            for node in ast.walk(ast.parse(path.read_text())):
                if isinstance(node, ast.ImportFrom):
                    assert not (node.module or "").startswith(("fastapi", "starlette")), str(path)

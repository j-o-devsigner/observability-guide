"""Offline check of the Monaco project (no tenant, no Monaco binary needed).

    python3 dynatrace/check.py

For every generated config: the template file exists, every {{ .param }} it uses is provided, and the rendered result
is valid JSON. The real gate before deploying is still `monaco deploy manifest.yaml --dry-run` in CI.
"""
from pathlib import Path
import json
import re
import sys
import yaml

HERE = Path(__file__).resolve().parent
PARAM = re.compile(r"\{\{\s*\.(\w+)\s*\}\}")
ESCAPE = re.compile(r'\{\{\s*"(\{\{|\}\})"\s*\}\}')     # {{ "{{" }} → literal {{ (workflow expressions)


def render(text, params):
    def sub(m):
        if m.group(1) not in params:
            raise KeyError(m.group(1))
        return str(params[m.group(1)])
    return ESCAPE.sub(lambda m: m.group(1), PARAM.sub(sub, text))


def main():
    files = sorted((HERE / "projects").rglob("config.yaml")) + [HERE / "shared" / "config.yaml"]
    ok = bad = 0
    ids = set()
    for f in files:
        for c in yaml.safe_load(f.read_text())["configs"]:
            if c["id"] in ids:
                print(f"FAIL {c['id']}: duplicate id (would overwrite another object)"); bad += 1; continue
            ids.add(c["id"])
            tpl = (f.parent / c["config"]["template"]).resolve()
            try:
                json.loads(render(tpl.read_text(), c["config"].get("parameters", {})))
                ok += 1
            except FileNotFoundError:
                print(f"FAIL {c['id']}: template {tpl} not found"); bad += 1
            except KeyError as e:
                print(f"FAIL {c['id']}: parameter {e} used in {tpl.name} but not provided"); bad += 1
            except json.JSONDecodeError as e:
                print(f"FAIL {c['id']}: rendered {tpl.name} is not valid JSON ({e})"); bad += 1
    print(f"{ok} configs rendered to valid JSON, {bad} failed")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()

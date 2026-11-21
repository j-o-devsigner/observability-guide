"""Build observability-guide.html from the Markdown files (single source of truth).

Run from the repo root:  python3 -I site/build.py   (or: make site)
The output is a single HTML file: Markdown is embedded as JSON and rendered in the browser with marked.
Do not edit observability-guide.html by hand.
"""
import json
import posixpath
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "observability-guide.html"
TEMPLATE = ROOT / "site" / "template.html"

# (group, path). Playbooks with "Status | skeleton" are skipped automatically.
ORDER = [
    ("1 · Foundations", "standard/00-start-here.md"),
    ("1 · Foundations", "standard/01-layers.md"),
    ("1 · Foundations", "standard/02-maturity-model.md"),
    ("1 · Foundations", "standard/03-definition-of-done.md"),
    ("2 · Signals", "standard/04-endpoint-coverage.md"),
    ("2 · Signals", "standard/05-logging-standard.md"),
    ("2 · Signals", "standard/06-workload-types.md"),
    ("2 · Signals", "standard/07-frontend-experience.md"),
    ("2 · Signals", "standard/08-kubernetes-cluster.md"),
    ("2 · Signals", "standard/09-internal-services.md"),
    ("3 · Reliability", "standard/10-slos-and-error-budgets.md"),
    ("3 · Reliability", "standard/11-alerting.md"),
    ("3 · Reliability", "standard/12-releases-and-dora.md"),
    ("3 · Reliability", "standard/13-capacity-and-saturation.md"),
    ("4 · Dashboards", "standard/14-dashboards.md"),
    ("5 · Platform", "standard/15-opentelemetry-practices.md"),
    ("5 · Platform", "standard/16-collector-templates.md"),
    ("5 · Platform", "standard/17-dynatrace-integration.md"),
    ("5 · Platform", "standard/18-automation-and-scale.md"),
    ("5 · Platform", "standard/19-cost-and-cardinality.md"),
    ("6 · People & process", "standard/20-ownership-and-communication.md"),
    ("6 · People & process", "standard/21-incident-response-and-on-call.md"),
    ("6 · People & process", "standard/22-resilience.md"),
    ("6 · People & process", "standard/23-measuring-effectiveness.md"),
    ("6 · People & process", "framework/transition-plan.md"),
    ("6 · People & process", "framework/slo-document-template.md"),
    ("6 · People & process", "framework/error-budget-policy-template.md"),
    ("6 · People & process", "framework/runbook-template.md"),
    ("6 · People & process", "framework/postmortem-template.md"),
    ("6 · People & process", "framework/game-day-template.md"),
    ("6 · People & process", "examples/case-study.md"),
    ("Playbooks", "playbooks/release-regression.md"),
    ("Playbooks", "playbooks/multi-client-endpoint.md"),
    ("Playbooks", "playbooks/dora-from-pipelines.md"),
    ("Playbooks", "playbooks/noisy-alerts-cleanup.md"),
    ("Reference", "collector/README.md"),
    ("Reference", "dynatrace/README.md"),
    ("Reference", "AGENTS.md"),
    ("Reference", "GLOSSARY.md"),
    ("Reference", "REFERENCES.md"),
    ("Open-source variants", "rules/README.md"),
    ("Open-source variants", "dashboards/README.md"),
]
FOLDER_INDEX = {"rules": "rules/README.md", "dashboards": "dashboards/README.md", "collector": "collector/README.md", "dynatrace": "dynatrace/README.md"}


def slug(path: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", path.lower().removesuffix(".md")).strip("-")


def title_of(md: str, path: str) -> str:
    m = re.search(r"^# (.+)$", md, re.M)
    return m.group(1).strip() if m else path


def rewrite_links(md: str, path: str, included: set) -> str:
    base = posixpath.dirname(path)

    def repl(m):
        text, target = m.group(1), m.group(2)
        if re.match(r"^(https?:|mailto:)", target):
            return m.group(0)
        file_part, _, frag = target.partition("#")
        if not file_part:  # same-document anchor
            return f"[{text}](#{slug(path)}--{frag})"
        resolved = posixpath.normpath(posixpath.join(base, file_part)).rstrip("/")
        if resolved in FOLDER_INDEX:
            resolved = FOLDER_INDEX[resolved]
        if resolved in included:
            anchor = f"{slug(resolved)}--{frag}" if frag else slug(resolved)
            return f"[{text}](#{anchor})"
        # A repo file that is not a page (rule file, JSON, test): show it as a path, not a dead link
        if text.strip("`").rstrip("/") in (resolved, posixpath.basename(resolved), file_part.rstrip("/")):
            return f"<span class=\"repo-path\">{resolved}</span>"
        return f"{text} <span class=\"repo-path\">{resolved}</span>"

    return re.sub(r"(?<!!)\[([^\]]+)\]\(([^)\s]+)\)", repl, md)


def main():
    docs = []
    for group, path in ORDER:
        md = (ROOT / path).read_text()
        if path.startswith("playbooks/") and re.search(r"^\| Status \| skeleton", md, re.M):
            continue
        docs.append({"group": group, "path": path, "slug": slug(path), "title": title_of(md, path), "md": md})
    included = {d["path"] for d in docs}
    for d in docs:
        d["md"] = rewrite_links(d["md"], d["path"], included)

    readme = (ROOT / "README.md").read_text()
    changelog = readme[readme.index("## Changelog"):]
    version = re.search(r"^\| (v[\d.]+) \| (\d{4}-\d{2}-\d{2}) \|", changelog, re.M)
    docs.append({"group": "Reference", "path": "CHANGELOG", "slug": "changelog", "title": "Changelog",
                 "md": "# Changelog\n\n" + changelog.split("\n", 1)[1]})

    payload = json.dumps(docs, ensure_ascii=False).replace("</", "<\\/")
    # Whole repo as text, so the page can offer "Download source (.zip)".
    skip = {OUT.name, ".git", "__pycache__", "node_modules"}
    src = {f.relative_to(ROOT).as_posix(): f.read_text()
           for f in sorted(ROOT.rglob("*"))
           if f.is_file() and not (set(f.relative_to(ROOT).parts) & skip) and f.suffix != ".pyc"}
    src_payload = json.dumps(src, ensure_ascii=False).replace("<", "\\u003c")
    # Placeholders first, payloads last: the embedded sources contain the placeholder strings too.
    html = (TEMPLATE.read_text()
            .replace("__VERSION__", f"{version.group(1)} · {version.group(2)}")
            .replace("__ZIPNAME__", f"observability-guide-{version.group(1)}.zip")
            .replace("/*__DIAGRAMS__*/", (ROOT / "site" / "diagrams.js").read_text())
            .replace("/*__CHARTS__*/", (ROOT / "site" / "charts.js").read_text()))
    html = html.replace("/*__DOCS__*/[]", payload, 1).replace("/*__SRC__*/{}", src_payload, 1)
    OUT.write_text(html)
    print(f"built {OUT.name}: {len(docs)} pages, {len(html) // 1024} KB, {version.group(1)}, {len(src)} source files")


if __name__ == "__main__":
    main()

"""Record installed runtime dependency metadata and preserve distributed license notices."""

import json
import re
import shutil
from importlib import metadata
from pathlib import Path

from packaging.requirements import Requirement

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "licenses"
TARGET.mkdir(exist_ok=True)


def safe(name):
    return re.sub(r"[^a-zA-Z0-9._-]", "_", name)


def is_notice(name):
    return name.upper().startswith(("LICENSE", "LICENCE", "COPYING", "NOTICE", "OFL", "AUTHORS"))


frontend = []
lock = json.loads((ROOT / "frontend/package-lock.json").read_text())
for package_path, data in lock["packages"].items():
    if not package_path or data.get("dev"):
        continue
    directory = ROOT / "frontend" / package_path
    manifest = json.loads((directory / "package.json").read_text())
    name = manifest["name"]
    entry = {
        "name": name,
        "version": data["version"],
        "license": manifest.get("license", data.get("license", "See distribution")),
    }
    frontend.append(entry)
    for source in directory.iterdir():
        if source.is_file() and is_notice(source.name):
            dest = TARGET / "frontend" / safe(name)
            dest.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, dest / source.name)

seen, backend = set(), []


def visit(name):
    dist = metadata.distribution(name)
    normalized = dist.metadata["Name"].lower().replace("_", "-")
    if normalized in seen:
        return
    seen.add(normalized)
    backend.append(
        {
            "name": dist.metadata["Name"],
            "version": dist.version,
            "license": dist.metadata.get("License-Expression")
            or dist.metadata.get("License")
            or "See distribution notices",
        }
    )
    for f in dist.files or []:
        if is_notice(Path(f).name):
            source = Path(dist.locate_file(f))
            if source.is_file():
                dest = TARGET / "backend" / safe(normalized)
                dest.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, dest / safe(str(f)))
    for requirement in dist.requires or []:
        req = Requirement(requirement)
        if req.marker is None or req.marker.evaluate({"extra": ""}):
            visit(req.name)


for line in (ROOT / "backend/requirements.txt").read_text().splitlines():
    if line.strip():
        visit(Requirement(line).name)
visit("socksio")
(TARGET / "dependency-inventory.json").write_text(
    json.dumps({"frontend": frontend, "backend": backend}, indent=2) + "\n"
)
print(f"Recorded {len(frontend)} frontend and {len(backend)} backend runtime distributions.")

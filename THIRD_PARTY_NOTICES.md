# Third-party notices

Original TermWise AI code is MIT licensed. No existing financial application or Synora implementation was copied. The following software is used as dependencies; copyright and license notices remain with its authors.

| Dependency | Use | License / source |
| --- | --- | --- |
| React / React DOM | Browser UI | MIT · https://github.com/facebook/react |
| Vite | Build/dev tooling | MIT · https://github.com/vitejs/vite |
| TypeScript | Type checking | Apache-2.0 · https://github.com/microsoft/TypeScript |
| Recharts | Financial timeline | MIT · https://github.com/recharts/recharts |
| Lucide | Icons | ISC · https://github.com/lucide-icons/lucide |
| DM Sans | Self-hosted font | SIL OFL 1.1 · bundled Fontsource package license |
| Manrope | Self-hosted font | SIL OFL 1.1 · https://github.com/sharanda/manrope |
| FastAPI | API | MIT · https://github.com/fastapi/fastapi |
| Pydantic | Validation | MIT · https://github.com/pydantic/pydantic |
| Uvicorn | ASGI server | BSD-3-Clause · https://github.com/encode/uvicorn |
| HTTPX | Optional provider requests | BSD-3-Clause · https://github.com/encode/httpx |
| python-multipart | Multipart uploads | Apache-2.0 · https://github.com/Kludex/python-multipart |
| pdfplumber | PDF parsing | MIT · https://github.com/jsvine/pdfplumber |
| python-docx | Word parsing | MIT · https://github.com/python-openxml/python-docx |
| pytest | Tests | MIT · https://github.com/pytest-dev/pytest |
| Playwright | Browser verification | Apache-2.0 · https://github.com/microsoft/playwright |
| Devpost Learn Skill Pack | Development curriculum/templates | MIT · https://github.com/challengepost/learn-ai-basics |

See `licenses/dependency-inventory.json` for versions and runtime dependency metadata. `licenses/frontend/` and `licenses/backend/` preserve license/notice files distributed with installed runtime packages, including transitive dependencies. Font licenses are included with the frontend notices. Package metadata alone is not a substitute for the actual license text.

Run `python scripts/collect_licenses.py` after dependency updates in a fully installed development environment. Distributed packages also retain their own notices when installed through npm/pip. Build/test tooling is not shipped as application code.

The official skill pack was installed unchanged; `skills-lock.json` records the source and hashes. Its MIT notice is preserved in `licenses/devpost-learn-LICENSE`. Planning documents use its templates, with the user's supplied requirements and a truthful pending-review status.

Fictional sample contracts and cash events were created for this project. PDF and DOCX fixtures were generated with locally available ReportLab (BSD) and python-docx; ReportLab is not a runtime dependency. Docling, Docket, OR-Tools, APEX, AFIS, and other researched projects are not incorporated in this build.

No model weights are bundled. A separately configured hosted or local AI service has its own terms and is not made open source by this application.

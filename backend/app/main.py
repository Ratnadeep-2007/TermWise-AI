import os
from decimal import Decimal
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from .engine import analyze, solve
from .extraction import MAX_BYTES, extract, parse_document
from .reports import generate_report
from .schemas import AnalysisRequest, ReportRequest, SolveRequest, TextRequest

app = FastAPI(
    title="TermWise AI",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)


@app.middleware("http")
async def security_headers(request, call_next):
    if request.url.path.startswith("/api/extract/"):
        length = request.headers.get("content-length")
        if length and (not length.isdigit() or int(length) > MAX_BYTES + 1024 * 1024):
            return JSONResponse(
                status_code=413,
                content={
                    "detail": "The upload request is too large. Use a file no larger than 10 MB."
                },
            )
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"
    )
    return response


@app.exception_handler(RequestValidationError)
async def invalid_request(request, exc):
    # Exclude input/context: they may contain sensitive contract text or non-JSON exceptions.
    issues = [
        {"field": ".".join(str(x) for x in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"detail": "Please check your inputs.", "issues": issues},
    )


@app.exception_handler(ValueError)
async def invalid_value(request, exc):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "ai_configured": bool(os.getenv("TERMWISE_AI_URL") and os.getenv("TERMWISE_AI_MODEL")),
        "storage": "Request memory only. No uploaded document persistence.",
        "version": "1.0.0",
    }


@app.get("/api/sample")
def sample():
    import json

    root = Path(__file__).resolve().parents[2]
    return json.loads((root / "sample_data" / "supplier.json").read_text())


@app.post("/api/extract/text")
async def extract_text(request: TextRequest):
    return await extract([{"page": None, "text": request.text}], request.name)


@app.post("/api/extract/upload")
async def extract_upload(file: Annotated[UploadFile, File()]):
    try:
        data = await file.read(MAX_BYTES + 1)
        # Strip path components; filenames never determine a filesystem write.
        name = (file.filename or "Document").replace("\\", "/").split("/")[-1][:200]
        pages = await run_in_threadpool(parse_document, name, data)
        return await extract(pages, name)
    finally:
        await file.close()


@app.post("/api/analyze")
def analysis(request: AnalysisRequest):
    return jsonable_encoder(analyze(request.deal, request.scenarios), custom_encoder={Decimal: str})


@app.post("/api/solve")
def solver(request: SolveRequest):
    return jsonable_encoder(solve(request.deal, request.options), custom_encoder={Decimal: str})


@app.post("/api/report")
def report(request: ReportRequest):
    return jsonable_encoder(generate_report(request), custom_encoder={Decimal: str})


@app.get("/api/{path:path}")
def missing_api(path: str):
    raise HTTPException(status_code=404, detail="API endpoint not found.")


dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if dist.is_dir():
    app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")

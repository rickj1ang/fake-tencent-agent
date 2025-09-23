from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.responses import StreamingResponse
import os
import asyncio
import json
from .detailed_analyzer import run_detailed
from .simple_recognizer import quick_label

app = FastAPI()

# Config
STATIC_DIR = os.getenv("STATIC_DIR", "/app/static")

@app.get("/health")
async def health():
    return {"status": "ok"}

# Single endpoint: stream quick first, then detailed
@app.post("/api/analyze-photo")
async def analyze_photo_stream(photo: UploadFile = File(...)):
    contents = await photo.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    async def event_stream():
        try:
            # run both concurrently
            quick_task = asyncio.to_thread(quick_label, contents)
            detailed_task = asyncio.to_thread(run_detailed, contents)

            # send quick as soon as ready
            quick = await quick_task
            yield f"event: quick\ndata: {json.dumps({'quick_result': quick}, ensure_ascii=False)}\n\n"

            # then detailed
            detailed = await detailed_task
            yield f"event: detailed\ndata: {json.dumps({'llm_output': detailed}, ensure_ascii=False)}\n\n"
            yield "event: done\ndata: {}\n\n"
        except Exception as e:
            err = {"error": str(e)}
            yield f"event: error\ndata: {json.dumps(err, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

# Mount static AFTER API routes so /api/* takes precedence
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

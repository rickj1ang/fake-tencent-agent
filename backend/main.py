from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
import os

app = FastAPI()

# Serve static frontend if present (mounted at root)
STATIC_DIR = os.getenv("STATIC_DIR", "/app/static")
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/api/analyze-photo")
async def analyze_photo(photo: UploadFile = File(...), prompt: str = Form("")):
    try:
        contents = await photo.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file uploaded.")
        return {
            "filename": photo.filename,
            "size_bytes": len(contents),
            "prompt": prompt,
            "llm_output": "Image received. Processing pipeline is ready.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Fallback to index.html for SPA routes when static exists
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Not Found")

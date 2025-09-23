from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

# Config
STATIC_DIR = os.getenv("STATIC_DIR", "/app/static")

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

# Mount static AFTER API routes so /api/* takes precedence
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

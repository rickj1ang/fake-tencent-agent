from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
import os
import json
from google.genai import Client
from detailed_analyzer import run_detailed
from simple_recognizer import quick_label
from stock_researcher import research_stock_info
from competitor_researcher import research_competitors

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
            print("[SSE] start request")

            # init async client per request
            aclient = Client(vertexai=True).aio

            # 1) Quick
            try:
                print("[SSE] quick: start")
                quick = await quick_label(aclient, contents)
                print(f"[SSE] quick: ok -> {quick[:60] if isinstance(quick, str) else quick}")
            except Exception as e:
                print(f"[SSE] quick: fail -> {e}")
                quick = ""
            yield f"event: quick\ndata: {json.dumps({'quick_result': quick}, ensure_ascii=False)}\n\n"

            # 2) Detailed
            try:
                print("[SSE] detailed: start")
                detailed = await run_detailed(aclient, contents)
                print(f"[SSE] detailed: ok -> {len(detailed) if isinstance(detailed, list) else 'N/A'} items")
            except Exception as e:
                print(f"[SSE] detailed: fail -> {e}")
                detailed = []
            yield f"event: detailed\ndata: {json.dumps({'detailed_products': detailed}, ensure_ascii=False)}\n\n"

            # 3) Stock
            if detailed and isinstance(detailed, list) and len(detailed) > 0:
                try:
                    print("[SSE] stock: start")
                    stock_data = await research_stock_info(aclient, detailed)
                    print(f"[SSE] stock: ok -> {len(stock_data) if stock_data else 0} items")
                    if stock_data:
                        yield f"event: stock\ndata: {json.dumps({'stock_info': stock_data}, ensure_ascii=False)}\n\n"
                except Exception as e:
                    print(f"[SSE] stock: fail -> {e}")

            # 4) Competitors
            if detailed and isinstance(detailed, list) and len(detailed) > 0:
                try:
                    print("[SSE] competitors: start")
                    comp_data = await research_competitors(aclient, detailed)
                    print(f"[SSE] competitors: ok -> {len(comp_data) if comp_data else 0} items")
                    if comp_data:
                        yield f"event: competitors\ndata: {json.dumps({'competitors': comp_data}, ensure_ascii=False)}\n\n"
                except Exception as e:
                    print(f"[SSE] competitors: fail -> {e}")

            print("[SSE] done")
            yield "event: done\ndata: {}\n\n"
        except Exception as e:
            print(f"[SSE] stream error: {e}")
            yield "event: done\ndata: {}\n\n"
        finally:
            try:
                await aclient.aclose()
            except Exception:
                pass

    return StreamingResponse(event_stream(), media_type="text/event-stream")

# Mount static AFTER API routes so /api/* takes precedence
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
import os
from google import genai
from google.genai import types

app = FastAPI()

# Config
STATIC_DIR = os.getenv("STATIC_DIR", "/app/static")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/api/analyze-photo")
async def analyze_photo(photo: UploadFile = File(...)):
    try:
        contents = await photo.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file uploaded.")
        client = genai.Client()
        prompts = '''
        ## 请详细识别照片中的主要的产品和物品。对于每个识别出的产品，请提取以下信息并以 JSON 数组的形式返回

        1.  **`product_name`**: 产品的通用名称（例如：智能手机、运动鞋、饮料瓶）。
        2.  **`brand`**: 产品的品牌名称（例如：Apple, Nike, Coca-Cola）。
        3.  **`model_or_specific_name`**: 产品的具体型号或更详细的名称（例如：iPhone 15 Pro Max, Air Force 1 Low, Classic Coke）。
        4.  **`product_category`**: 产品所属的通用类别（例如：电子产品、服装、食品饮料、汽车、家居用品）。
        5.  **`manufacturer_or_parent_company`**: 制造该产品或拥有该品牌的公司名称（例如：Apple Inc., Nike Inc., The Coca-Cola Company）。

        ## 示例 JSON 输出结构
        [
          {
            "product_name": "智能手机",
            "brand": "Apple",
            "model_or_specific_name": "iPhone 15 Pro Max",
            "product_category": "电子产品",
            "manufacturer_or_parent_company": "Apple Inc."
          },
          {
            "product_name": "运动鞋",
            "brand": "Nike",
            "model_or_specific_name": "Air Force 1 Low",
            "product_category": "服装",
            "manufacturer_or_parent_company": "Nike Inc."
          }
        ]
        '''
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                        types.Part.from_bytes(mime_type="image/jpeg", data=contents),
                        types.Part.from_text(text=prompts)
                    ],
        )
        return {
            "llm_output": response.text,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Mount static AFTER API routes so /api/* takes precedence
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

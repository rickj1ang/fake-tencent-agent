from google import genai
from google.genai import types
from google.genai.types import HttpOptions
import json


def run_detailed(contents: bytes) -> list | None:
    client = genai.Client()
    
    # 定义JSON schema
    response_schema = {
        "type": "ARRAY",
        "items": {
            "type": "OBJECT",
            "properties": {
                "product_name": {"type": "STRING"},
                "brand": {"type": "STRING"},
                "model_or_specific_name": {"type": "STRING"},
                "product_category": {"type": "STRING"},
                "manufacturer_or_parent_company": {"type": "STRING"}
            },
            "required": ["product_name", "brand", "model_or_specific_name", "product_category", "manufacturer_or_parent_company"]
        }
    }
    
    prompts = '''
        请详细识别照片中的主要的产品和物品。对于每个识别出的产品，请提取以下信息：

        1.  **`product_name`**: 产品的通用名称（例如：智能手机、运动鞋、饮料瓶）。
        2.  **`brand`**: 产品的品牌名称（例如：Apple, Nike, Coca-Cola）。
        3.  **`model_or_specific_name`**: 产品的具体型号或更详细的名称（例如：iPhone 15 Pro Max, Air Force 1 Low, Classic Coke）。
        4.  **`product_category`**: 产品所属的通用类别（例如：电子产品、服装、食品饮料、汽车、家居用品）。
        5.  **`manufacturer_or_parent_company`**: 制造该产品或拥有该品牌的公司名称（例如：Apple Inc., Nike Inc., The Coca-Cola Company）。
        '''
    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(mime_type="image/jpeg", data=contents),
            types.Part.from_text(text=prompts)
        ],
        config={
            "response_mime_type": "application/json",
            "response_schema": response_schema,
        },
    )
    
    try:
        # 解析JSON响应
        return json.loads(response.text)
    except json.JSONDecodeError as e:
        print(f"JSON解析错误: {e}")
        return None

from google import genai
from google.genai.types import (
    GenerateContentConfig,
    GoogleSearch,
    HttpOptions,
    Tool,
)
import json


def research_stock_info(products_data: list) -> list | None:
    """
    根据产品信息搜索相关公司的股价和近况
    """
    if not products_data or not isinstance(products_data, list):
        return None
    
    client = genai.Client()
    
    # 提取所有公司名称
    companies = []
    for product in products_data:
        if isinstance(product, dict):
            company = product.get('manufacturer_or_parent_company', '')
            brand = product.get('brand', '')
            if company and company not in companies:
                companies.append(company)
            elif brand and brand not in companies:
                companies.append(brand)
    
    if not companies:
        return None
    
    # 构建搜索提示
    companies_str = ', '.join(companies)
    prompt = f"""
    请搜索以下公司的股价和最新近况信息：{companies_str}
    
    对于每个公司，请提供：
    1. 当前股价（如果可获取）
    2. 近期股价趋势（上涨/下跌/稳定）
    3. 公司最新新闻或重要事件（简要）
    4. 公司业务概况（1-2句话）
    
    请以JSON格式返回，结构如下：
    [
      {{
        "company_name": "公司名称",
        "stock_price": "当前股价或N/A",
        "price_trend": "上涨/下跌/稳定",
        "recent_news": "最新新闻摘要",
        "business_overview": "业务概况"
      }}
    ]
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=GenerateContentConfig(
                tools=[
                    Tool(google_search=GoogleSearch())
                ],
            ),
        )
        
        # 尝试解析JSON响应
        response_text = response.text
        
        # 查找JSON部分（可能在```json```代码块中）
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            json_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            json_text = response_text[start:end].strip()
        else:
            json_text = response_text
        
        # 解析JSON
        stock_data = json.loads(json_text)
        return stock_data
        
    except json.JSONDecodeError as e:
        print(f"JSON解析错误: {e}")
        print(f"原始响应: {response_text}")
        return None
    except Exception as e:
        print(f"搜索股价信息时出错: {e}")
        return None

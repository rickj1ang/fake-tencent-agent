from google import genai
from google.genai.types import (
    GenerateContentConfig,
    GoogleSearch,
    Tool,
)
import json
async def research_competitors(aclient, detailed_products: list) -> list:
    """
    Given detailed product list, research competitor or overlapping-business companies
    and fetch their current stock price and brief status via Google Search Tool.

    Returns a JSON-serializable Python list of objects:
    [{ company_name, stock_price, price_trend, business_overlap_reason, recent_news }]
    """
    # aclient is an async client; HttpOptions is already implied by your config

    # Build a unique set of seed companies from detailed products
    companies = []
    for product in detailed_products:
        company_name = product.get("manufacturer_or_parent_company") or product.get("brand")
        if company_name and company_name not in companies:
            companies.append(company_name)

    if not companies:
        return []

    queries = []
    for company in companies:
        queries.append(
            (
                f"针对公司 {company}，请列出与其业务有重叠或主要竞对的公司，并给出每家公司的当前股价、"
                f"价格趋势（上涨/下跌/稳定），以及一句话的业务重叠理由或竞争关系，"
                f"再给一条最近重要新闻。请以JSON数组返回，字段包括：company_name, stock_price, price_trend, "
                f"business_overlap_reason, recent_news。若信息缺失用'N/A'。"
            )
        )

    full_prompt = (
        "请使用Google搜索工具完成以下信息检索，并严格以JSON数组返回所有公司结果。\n\n"
        + "\n".join(queries)
    )

    response = await aclient.models.generate_content(
        model="gemini-2.5-flash",
        contents=full_prompt,
        config=GenerateContentConfig(
            tools=[Tool(google_search=GoogleSearch())]
        ),
    )

    response_text = response.text or ""
    # Extract possible JSON from markdown code fences
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

    try:
        data = json.loads(json_text)
        if isinstance(data, list):
            return data
        # If single object returned, wrap to list
        if isinstance(data, dict):
            return [data]
        return []
    except json.JSONDecodeError:
        # Return empty to avoid breaking the SSE stream
        return []
    except Exception:
        return []



from google.genai import types


async def quick_label(aclient, contents: bytes) -> str:
    prompt = "用简短中文回答：这张图片的主体是什么？尽量10个字以内。"
    resp = await aclient.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=[
            types.Part.from_bytes(mime_type="image/jpeg", data=contents),
            types.Part.from_text(text=prompt),
        ],
    )
    return (resp.text or "").strip()

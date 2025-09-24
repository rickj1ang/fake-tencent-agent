from google import genai
from google.genai import types


def quick_label(contents: bytes) -> str:
    client = genai.Client()
    prompt = "用简短中文回答：这张图片的主体是什么？尽量10个字以内。"
    resp = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=[
            types.Part.from_bytes(mime_type="image/jpeg", data=contents),
            types.Part.from_text(text=prompt)
        ],
    )
    return (resp.text or "").strip()

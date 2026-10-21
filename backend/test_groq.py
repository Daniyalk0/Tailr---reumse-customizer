import os
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq

# Locate the root .env, one directory above backend/
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

api_key = os.getenv("GROQ_API_KEY")
print(f"Using GROQ_API_KEY: {api_key}")

if not api_key:
    raise RuntimeError("GROQ_API_KEY is missing from the root .env")

client = Groq(api_key=api_key)

response = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {
            "role": "user",
            "content": (
                "Rewrite this resume bullet professionally without "
                "inventing facts: Built a website using React."
            ),
        }
    ],
    temperature=0.2,
    max_tokens=200,
)

print(response.choices[0].message.content)

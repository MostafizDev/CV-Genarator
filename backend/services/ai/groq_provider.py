import re
from groq import Groq
from services.ai.base import AiProvider


class GroqProvider(AiProvider):
    def __init__(self, api_key: str, model: str = "openai/gpt-oss-120b"):
        self.api_key = api_key.strip()
        self.model = model.strip() if model and model.strip() else "openai/gpt-oss-120b"
        if not self.api_key:
            raise ValueError("Groq API key cannot be empty.")
        self.client = Groq(api_key=self.api_key)

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
        )

        content = response.choices[0].message.content
        if not content:
            return ""

        content = content.strip()
        # Strip reasoning thinking tags if present (e.g. from Qwen or DeepSeek models)
        content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
        return content

import os
from openai import OpenAI
from services.ai.base import AiProvider


class OpenAiProvider(AiProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key.strip()
        self.model = model.strip() if model and model.strip() else "gpt-4o-mini"
        if not self.api_key:
            raise ValueError("OpenAI API key cannot be empty.")
        self.client = OpenAI(api_key=self.api_key)

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
        return content.strip()

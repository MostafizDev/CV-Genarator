import google.generativeai as genai
from services.ai.base import AiProvider


class GeminiProvider(AiProvider):
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        self.api_key = api_key.strip()
        self.model = model.strip() if model and model.strip() else "gemini-1.5-flash"
        if not self.api_key:
            raise ValueError("Gemini API key cannot be empty.")
        genai.configure(api_key=self.api_key)

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        client = genai.GenerativeModel(
            model_name=self.model,
            system_instruction=system_prompt or None,
        )
        response = client.generate_content(
            prompt,
            generation_config={"temperature": 0.7},
        )

        text = getattr(response, "text", None)
        if not text:
            return ""
        return text.strip()

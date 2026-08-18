from anthropic import Anthropic
from services.ai.base import AiProvider


class ClaudeProvider(AiProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-5"):
        self.api_key = api_key.strip()
        self.model = model.strip() if model and model.strip() else "claude-sonnet-5"
        if not self.api_key:
            raise ValueError("Anthropic API key cannot be empty.")
        self.client = Anthropic(api_key=self.api_key)

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        kwargs = {}
        if system_prompt:
            kwargs["system"] = system_prompt

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}],
            **kwargs,
        )

        text_blocks = [block.text for block in response.content if block.type == "text"]
        content = "".join(text_blocks)
        return content.strip()

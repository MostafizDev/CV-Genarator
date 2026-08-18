from typing import Protocol


class AiProvider(Protocol):
    def generate(self, prompt: str, system_prompt: str = "") -> str:
        """
        Generate a completion given a user prompt and optional system prompt.
        Returns the raw string output from the model.
        """
        ...

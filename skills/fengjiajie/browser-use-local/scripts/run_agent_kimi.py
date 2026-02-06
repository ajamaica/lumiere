import asyncio
import os

from dotenv import load_dotenv
from browser_use import Agent, ChatOpenAI


async def main() -> None:
    load_dotenv()

    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL")

    if not api_key:
        raise SystemExit("OPENAI_API_KEY is not set")
    if not base_url:
        raise SystemExit("OPENAI_BASE_URL is not set")

    llm = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "kimi-k2.5"),
        api_key=api_key,
        base_url=base_url,
        # Moonshot/Kimi observed constraints:
        temperature=float(os.getenv("OPENAI_TEMPERATURE", "1")),
        frequency_penalty=float(os.getenv("OPENAI_FREQUENCY_PENALTY", "0")),
        # Make JSON Schema compatible with stricter gateways:
        remove_defaults_from_schema=True,
        remove_min_items_from_schema=True,
    )

    agent = Agent(
        task=os.getenv(
            "BROWSER_USE_TASK",
            "Open https://example.com and return the page title.",
        ),
        llm=llm,
    )

    history = await agent.run(max_steps=int(os.getenv("BROWSER_USE_MAX_STEPS", "15")))
    print(history.final_result())


if __name__ == "__main__":
    asyncio.run(main())

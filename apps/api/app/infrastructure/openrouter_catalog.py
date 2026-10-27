import httpx


class OpenRouterCatalog:
    def __init__(self, settings):
        self.client = httpx.AsyncClient(timeout=15)
        self.url = settings.openrouter_base_url.rstrip("/") + "/models"

    async def fetch(self):
        response = await self.client.get(self.url)
        response.raise_for_status()
        return response.json()["data"]

    async def close(self):
        await self.client.aclose()

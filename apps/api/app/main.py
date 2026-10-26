"""ASGI entrypoint; application.py composes controllers and business services."""

from .application import create_app

app = create_app()

from starlette.requests import HTTPConnection

from ..core.container import Services


def get_services(connection: HTTPConnection) -> Services:
    return connection.app.state.services

class BusinessError(Exception):
    """Transport-independent error; the HTTP controller maps code to status."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class ProviderError(RuntimeError):
    """Safe, user-facing model-service failure shared by adapters and use cases."""

    pass

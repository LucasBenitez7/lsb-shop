class ShopError(Exception):
    status_code: int = 500
    default_message: str = "Ha ocurrido un error. Inténtalo de nuevo."


class InsufficientStock(ShopError):
    status_code = 400

    def __init__(self, product_name: str) -> None:
        self.default_message = f"Stock insuficiente para '{product_name}'."


class ResourceNotFound(ShopError):
    status_code = 404
    default_message = "El recurso solicitado no existe."


class PaymentFailed(ShopError):
    status_code = 402
    default_message = "El pago no pudo procesarse. Verifica tus datos."


class PermissionDenied(ShopError):
    status_code = 403
    default_message = "No tienes permisos para realizar esta acción."


class CartExpired(ShopError):
    status_code = 400
    default_message = "Tu carrito ha expirado. Por favor agrégalo de nuevo."

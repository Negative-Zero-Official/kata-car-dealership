from decimal import Decimal
from typing import Annotated

from pydantic import PlainSerializer

# The one place money is turned into JSON: always a string with two decimal places, never a float.
Money = Annotated[
    Decimal, PlainSerializer(lambda value: f"{value:.2f}", return_type=str, when_used="json")
]

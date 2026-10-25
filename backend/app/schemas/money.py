from decimal import Decimal
from typing import Annotated

from pydantic import PlainSerializer

# The one place money is turned into JSON: always a string, never a float.
Money = Annotated[Decimal, PlainSerializer(str, return_type=str, when_used="json")]

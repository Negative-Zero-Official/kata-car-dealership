from decimal import Decimal
from typing import NamedTuple


class DemoVehicle(NamedTuple):
    make: str
    model: str
    category: str
    price: Decimal
    quantity: int


# Realistic list prices for screenshots; three are sold out to show the disabled Purchase button.
DEMO_VEHICLES: tuple[DemoVehicle, ...] = (
    DemoVehicle("Toyota", "Corolla", "sedan", Decimal("23495.00"), 8),
    DemoVehicle("Honda", "Civic", "sedan", Decimal("25045.00"), 5),
    DemoVehicle("BMW", "3 Series", "sedan", Decimal("46675.00"), 0),
    DemoVehicle("Toyota", "RAV4", "suv", Decimal("30025.00"), 6),
    DemoVehicle("Mazda", "CX-5", "suv", Decimal("29990.00"), 3),
    DemoVehicle("Jeep", "Wrangler", "suv", Decimal("33690.00"), 0),
    DemoVehicle("Ford", "F-150", "truck", Decimal("38810.00"), 4),
    DemoVehicle("Ram", "1500", "truck", Decimal("41365.00"), 2),
    DemoVehicle("Volkswagen", "Golf GTI", "hatchback", Decimal("32195.00"), 1),
    DemoVehicle("Ford", "Mustang", "coupe", Decimal("31920.00"), 0),
    DemoVehicle("Tesla", "Model 3", "electric", Decimal("42490.00"), 7),
    DemoVehicle("Chevrolet", "Bolt EUV", "electric", Decimal("28795.00"), 2),
)

from fastapi import FastAPI


def create_app() -> FastAPI:
    return FastAPI(title="Car Dealership API")


app = create_app()

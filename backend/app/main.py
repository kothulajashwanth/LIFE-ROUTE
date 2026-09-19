from fastapi import FastAPI

app = FastAPI(
    title="LIFE-ROUTE API",
    description="Backend API for LIFE-ROUTE emergency vehicle routing and traffic intelligence system.",
    version="0.1.0",
)


@app.get("/")
def read_root():
    return {
        "name": "LIFE-ROUTE API",
        "status": "online",
        "version": "0.1.0",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}

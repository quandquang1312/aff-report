from fastapi import FastAPI, UploadFile, Form, File
import os
from analyzer import analyze
from fastapi.middleware.cors import CORSMiddleware

os.makedirs("temp", exist_ok=True)

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "http://localhost:5173")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "API is running"
    }

@app.post("/analyze")
async def analyze_report(
    ads_file: UploadFile = File(...),
    isInner: bool = Form(False),
    shopee_report_files: list[UploadFile] = File(...)
):
    ads_path = await save_file(ads_file)
    shopee_paths = [await save_file(f) for f in shopee_report_files]

    result = analyze(
        ads_path,
        isInner,
        shopee_paths
    )

    return result

async def save_file(upload_file):
    file_path = f"temp/{upload_file.filename}"

    with open(file_path, "wb") as f:
        content = await upload_file.read()
        f.write(content)

    return file_path
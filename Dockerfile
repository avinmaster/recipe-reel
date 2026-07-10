# RecipeReel API — slim, runnable-anywhere image (satisfies the hackathon
# "all submissions must be containerized" rule). Runs the full API with the
# Fireworks/AMD-endpoint providers, or fully offline in MOCK_MODE with zero config.
#
# Heavy GPU perception (local Whisper + Qwen2.5-VL) is meant to run on the AMD
# MI300X pod using the ROCm base image — see Dockerfile.rocm.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# ffmpeg for audio/frame extraction; the rest is pure-Python.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY fixtures ./fixtures
COPY README.md LICENSE ./

EXPOSE 8000

# Zero-config demo runs offline; set FIREWORKS_API_KEY (+ providers) for real runs.
ENV MOCK_MODE=true \
    DATA_DIR=/data \
    DATABASE_URL=sqlite:////data/recipereel.db
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

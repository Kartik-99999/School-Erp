# syntax=docker/dockerfile:1
# Backend (FastAPI, async) — gunicorn + uvicorn workers, non-root.
# Build context = repo ROOT (the image needs backend/ AND db/schema.sql for the bring-up job):
#   docker build -f backend/Dockerfile -t <registry>/erp-backend:<tag> .
FROM python:3.9-slim-bullseye

# WeasyPrint (PDF receipts / report cards) renders via Pango/cairo/gdk-pixbuf at runtime.
# Without these the app still boots (WeasyPrint is imported lazily and fails closed -> PDF
# endpoints 503); install them so PDFs work. Names are for Debian 11 (bullseye).
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libgdk-pixbuf2.0-0 \
        libffi7 shared-mime-info fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies first (layer cache). Paths are backend/* because the context is the repo root.
COPY backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# Application code + DB bring-up assets (schema.sql lives at db/).
COPY backend/ ./
COPY db/ ./db/

# Run as a non-root user.
RUN useradd -u 1001 -m appuser && chown -R appuser:appuser /app
USER appuser

# gunicorn process manager + uvicorn (ASGI/async) workers. Tune count via WEB_CONCURRENCY.
ENV PORT=8000 WEB_CONCURRENCY=4
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').getcode()==200 else 1)"
CMD ["sh", "-c", "exec gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w ${WEB_CONCURRENCY} -b 0.0.0.0:${PORT} --timeout 120 --graceful-timeout 30 --keep-alive 5 --access-logfile - --error-logfile -"]

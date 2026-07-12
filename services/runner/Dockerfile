FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git chromium \
    && rm -rf /var/lib/apt/lists/*

COPY services/runner/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt \
    && pip install --no-cache-dir "git+https://github.com/NousResearch/hermes-agent.git"

COPY services/runner/src /app/src

ENV PYTHONPATH=/app/src

CMD ["python", "-m", "grimreaper_runner.main"]

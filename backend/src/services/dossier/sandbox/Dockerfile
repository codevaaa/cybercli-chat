FROM python:3.12.8-alpine3.21
WORKDIR /workspace
COPY runtime.py /runtime/runtime.py
COPY data_runtime.py /runtime/data_runtime.py
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
USER 65532:65532
CMD ["python", "/runtime/runtime.py", "serve"]

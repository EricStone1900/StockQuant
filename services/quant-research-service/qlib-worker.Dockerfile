FROM python:3.11-slim
WORKDIR /opt/qlib
RUN pip install --no-cache-dir pyqlib==0.9.6
COPY qlib-worker.py .
ENV QLIB_SOURCE_COMMIT=qlib-0.9.6
CMD ["python", "qlib-worker.py"]

.PHONY: install test eval bench api ui docker-up docker-down clean

install:
	pip install -r requirements.txt

test:
	pytest -v

eval:
	python scripts/evaluate.py

bench:
	python scripts/benchmark.py

ingest:
	python scripts/ingest.py --dir data/sample_papers

api:
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

ui:
	streamlit run frontend/streamlit_app.py

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

clean:
	rm -rf __pycache__ .pytest_cache htmlcov .coverage

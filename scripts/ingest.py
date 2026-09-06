import sys
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import fitz
from rich.console import Console
from rich.table import Table
from app.config import get_settings
from app.ingestion.chunker import StructureAwareChunker
from app.ingestion.parser import PDFParser
from app.models.cohere_client import get_cohere_client
from app.retrieval.bm25 import get_bm25_index
from app.retrieval.vector_store import get_vector_store
console = Console()

def create_pdf_from_text(text_path: Path, pdf_path: Path) -> None:
    doc = fitz.open()
    with open(text_path, 'r', encoding='utf-8') as f:
        content = f.read()
    lines = content.split('\n')
    page_lines: list[str] = []
    for line in lines:
        page_lines.append(line)
        if len(page_lines) >= 45:
            page = doc.new_page(width=595, height=842)
            text_to_insert = '\n'.join(page_lines)
            page.insert_textbox(fitz.Rect(50, 50, 545, 792), text_to_insert, fontsize=10, fontname='helv')
            page_lines = []
    if page_lines:
        page = doc.new_page(width=595, height=842)
        text_to_insert = '\n'.join(page_lines)
        page.insert_textbox(fitz.Rect(50, 50, 545, 792), text_to_insert, fontsize=10, fontname='helv')
    doc.save(str(pdf_path))
    doc.close()

def ingest_directory(dir_path: str) -> None:
    path = Path(dir_path)
    if not path.exists():
        console.print(f"[bold red]Directory '{dir_path}' does not exist.[/bold red]")
        return
    for txt_file in path.glob('*.txt'):
        pdf_file = path / f'{txt_file.stem}.pdf'
        if not pdf_file.exists():
            create_pdf_from_text(txt_file, pdf_file)
    files = list(path.glob('*.pdf')) + [f for f in path.glob('*.txt') if not (path / f'{f.stem}.pdf').exists()]
    if not files:
        console.print(f"[yellow]No supported files found in '{dir_path}'.[/yellow]")
        return
    settings = get_settings()
    parser = PDFParser()
    chunker = StructureAwareChunker(target_chunk_size=settings.CHUNK_SIZE, chunk_overlap=settings.CHUNK_OVERLAP)
    cohere_client = get_cohere_client()
    vector_store = get_vector_store()
    bm25_index = get_bm25_index()
    table = Table(title=f'Ingestion Report ({len(files)} files)', show_header=True, header_style='bold cyan')
    table.add_column('Filename', style='magenta')
    table.add_column('Title', style='white')
    table.add_column('Pages', justify='right')
    table.add_column('Sections', justify='right')
    table.add_column('Chunks', justify='right')
    total_chunks = 0
    for f in files:
        with open(f, 'rb') as fp:
            data = fp.read()
        parsed_doc = parser.parse_bytes(data, filename=f.name)
        chunks = chunker.chunk_document(parsed_doc)
        embeddings = cohere_client.embed([c.full_text for c in chunks], input_type='search_document')
        for c, emb in zip(chunks, embeddings):
            c.embedding = emb
        vector_store.add_chunks(chunks)
        bm25_index.add_chunks(chunks)
        total_chunks += len(chunks)
        table.add_row(f.name, parsed_doc.metadata.title[:35], str(parsed_doc.metadata.page_count), str(len(parsed_doc.metadata.section_titles)), str(len(chunks)))
    console.print(table)
    console.print(f'\n[bold green]Successfully indexed {len(files)} files ({total_chunks} total chunks) into VectorStore and BM25 index.[/bold green]\n')

def main():
    parser = argparse.ArgumentParser(description='Ingest research documents into CRI')
    parser.add_argument('--dir', default='data/sample_papers', help='Directory containing PDFs or research papers')
    args = parser.parse_args()
    ingest_directory(args.dir)
if __name__ == '__main__':
    main()

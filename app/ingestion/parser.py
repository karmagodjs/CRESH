import hashlib
import io
import re
import unicodedata
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from pydantic import BaseModel, Field
import fitz
from app.ingestion.metadata import DocumentMetadata
from app.observability.logging import get_logger
logger = get_logger('parser')

class ParsedSection(BaseModel):
    title: str
    section_name: str = ''
    section_number: str = ''
    section_type: str = 'other'
    content: str
    page_start: int
    page_end: int
    start_char: int = 0
    end_char: int = 0

class ParsedPage(BaseModel):
    page_number: int
    text: str
    char_count: int

class ParsedDocument(BaseModel):
    metadata: DocumentMetadata
    pages: List[ParsedPage] = Field(default_factory=list)
    sections: List[ParsedSection] = Field(default_factory=list)
    full_text: str = ''

class PDFParser:
    def parse_file(self, file_path: Union[str, Path]) -> ParsedDocument:
        path = Path(file_path)
        with open(path, 'rb') as f:
            data = f.read()
        return self.parse_bytes(data, filename=path.name)

    def parse_bytes(self, file_bytes: bytes, filename: str = 'document.pdf') -> ParsedDocument:
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        file_size = len(file_bytes)
        ext = Path(filename).suffix.lower()
        if ext in ['.txt', '.md']:
            return self._fallback_text_parse(file_bytes, filename, file_hash, file_size)
        try:
            doc = fitz.open(stream=file_bytes, filetype='pdf')
        except Exception as e:
            logger.warning(f'Failed to parse PDF with fitz: {e}. Falling back to plain text decoder.')
            return self._fallback_text_parse(file_bytes, filename, file_hash, file_size)

        pages: List[ParsedPage] = []
        full_text_parts: List[str] = []
        detected_title = filename.replace('.pdf', '').replace('_', ' ').title()
        meta = doc.metadata or {}
        if meta.get('title') and len(meta['title'].strip()) > 3:
            detected_title = meta['title'].strip()
        authors = []
        if meta.get('author'):
            authors = [a.strip() for a in meta['author'].split(',') if a.strip()]

        raw_blocks: List[Dict[str, Any]] = []
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_num = page_idx + 1
            blocks = page.get_text('dict').get('blocks', [])
            page_text_lines = []
            for b in blocks:
                if b.get('type') == 0:
                    lines: List[str] = []
                    max_font_size = 0.0
                    is_bold = False
                    for line in b.get('lines', []):
                        spans = line.get('spans', [])
                        span_text = ' '.join([s.get('text', '').strip() for s in spans if s.get('text', '').strip()])
                        if span_text:
                            lines.append(span_text)
                        for s in spans:
                            fs = float(s.get('size', 0.0))
                            if fs > max_font_size:
                                max_font_size = fs
                            if 'bold' in str(s.get('font', '')).lower():
                                is_bold = True
                    block_text = self._clean_text('\n'.join(lines))
                    if block_text:
                        raw_blocks.append({
                            'page_num': page_num,
                            'lines': lines,
                            'text': block_text,
                            'max_font_size': max_font_size,
                            'is_bold': is_bold
                        })
                        page_text_lines.append(block_text)
            page_full_text = '\n\n'.join(page_text_lines)
            pages.append(ParsedPage(page_number=page_num, text=page_full_text, char_count=len(page_full_text)))
            full_text_parts.append(page_full_text)

        full_text = '\n\n--- Page Break ---\n\n'.join(full_text_parts)
        if not meta.get('title') or len(meta.get('title', '').strip()) <= 3 or re.match(r'^(?:\d{4}\.\d{4,5}|document|untitled|paper)', detected_title, re.I):
            for blk in raw_blocks:
                if blk['page_num'] == 1 and not self._is_metadata_or_stamp(blk['text']):
                    lines = blk['lines']
                    if lines and len(lines[0]) > 10 and not self._is_metadata_or_stamp(lines[0]):
                        title_cand = ' '.join(lines[:2]).strip()
                        if not re.match(r'^(?:abstract|1\s+introduction)', title_cand, re.I):
                            detected_title = title_cand
                            break

        sections = self._extract_sections(raw_blocks)
        section_titles = [s.title for s in sections]
        doc_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, file_hash))
        metadata = DocumentMetadata(
            document_id=doc_id,
            filename=filename,
            title=detected_title,
            authors=authors,
            page_count=len(pages),
            file_size_bytes=file_size,
            file_hash=file_hash,
            section_titles=section_titles
        )
        return ParsedDocument(metadata=metadata, pages=pages, sections=sections, full_text=full_text)

    def _is_metadata_or_stamp(self, text: str, is_single_line: bool = True) -> bool:
        t = text.strip()
        if not t:
            return True
        if re.match(r'^(?:arxiv:\s*\d{4}\.\d{4,5}|doi:\s*|https?://|www\.|@|\{)', t, re.I):
            return True
        if is_single_line and re.match(r'^\d{1,4}$', t):
            return True
        if 'arxiv:' in t.lower() or 'arxiv.org' in t.lower():
            return True
        if 'google ai language' in t.lower() or '@google.com' in t.lower():
            return True
        if 'all rights reserved' in t.lower() or 'permission to make digital' in t.lower():
            return True
        return False

    def _classify_section_type(self, name: str, num: str = '') -> str:
        n = name.lower()
        if 'abstract' in n:
            return 'abstract'
        if 'intro' in n:
            return 'introduction'
        if 'contribution' in n:
            return 'contributions'
        if 'related' in n or 'prior work' in n or 'background' in n:
            return 'related_work'
        if any(k in n for k in ['bert', 'method', 'approach', 'architecture', 'pre-train', 'fine-tun', 'model', 'training']):
            return 'methodology'
        if any(k in n for k in ['experiment', 'evaluation', 'results', 'benchmark', 'glue', 'squad', 'swag']):
            return 'experiments'
        if any(k in n for k in ['ablation', 'analysis', 'discussion']):
            return 'ablation'
        if 'conclu' in n:
            return 'conclusion'
        if 'ref' in n:
            return 'references'
        if 'appendix' in n:
            return 'appendix'
        return 'other'

    def _detect_heading(self, lines: List[str], max_font_size: float = 0.0) -> Tuple[bool, str, str, str]:
        if not lines:
            return False, '', '', 'other'

        first_line = lines[0].strip()
        if self._is_metadata_or_stamp(first_line, is_single_line=(len(lines) == 1)):
            return False, '', '', 'other'

        # 1. Abstract
        if first_line.lower() == 'abstract':
            return True, '', 'Abstract', 'abstract'

        # 2. References
        if first_line.lower() in ['references', 'bibliography']:
            return True, '', 'References', 'references'

        # 3. Conclusion
        if first_line.lower() in ['conclusion', 'conclusions']:
            return True, '', first_line.title(), 'conclusion'

        # 4. Multi-line numbered heading (e.g. line 0 is "1", line 1 is "Introduction")
        if len(lines) >= 2 and re.match(r'^[1-9]\d?(?:\.\d+){0,2}$', lines[0]):
            title_cand = lines[1].strip()
            if re.search(r'[A-Za-z]{3,}', title_cand) and len(title_cand.split()) <= 7 and not title_cand.endswith(('.', ',', ';', ':')):
                if not ('[' in title_cand or ']' in title_cand):
                    num = lines[0]
                    name = title_cand
                    return True, num, name, self._classify_section_type(name, num)

        # 5. Single-line numbered heading (e.g. "1 Introduction" or "3.1 Pre-training BERT")
        m = re.match(r'^([1-9]\d?(?:\.\d+){0,2})\s+([A-Z][A-Za-z0-9\s,\-:–—]+)$', first_line)
        if m:
            num = m.group(1)
            name = m.group(2).strip()
            if len(name.split()) <= 7 and not name.endswith(('.', ',', ';', ':')) and not ('[' in name or ']' in name):
                return True, num, name, self._classify_section_type(name, num)

        # 6. Specific well-known unnumbered headings
        known_unnum = {
            'introduction': 'introduction',
            'related work': 'related_work',
            'background': 'related_work',
            'ablation studies': 'ablation',
            'experiments': 'experiments',
            'experimental results': 'experiments',
            'results and discussion': 'experiments',
            'methodology': 'methodology',
            'model architecture': 'methodology',
            'system design': 'methodology'
        }
        if first_line.lower() in known_unnum:
            return True, '', first_line.title(), known_unnum[first_line.lower()]

        # 7. Appendix
        if re.match(r'^Appendix(?:\s+[A-Z])?(?::|\s+|$)', first_line, re.I):
            return True, '', first_line, 'appendix'

        return False, '', '', 'other'

    def _extract_sections(self, raw_blocks: List[Dict[str, Any]]) -> List[ParsedSection]:
        sections: List[ParsedSection] = []
        current_title = 'Abstract'
        current_name = 'Abstract'
        current_num = ''
        current_type = 'abstract'
        current_page_start = 1
        current_page_end = 1
        current_content_parts: List[str] = []

        for blk in raw_blocks:
            lines = blk['lines']
            text = blk['text']
            page_num = blk['page_num']

            if self._is_metadata_or_stamp(text):
                continue

            is_sec, sec_num, sec_name, sec_type = self._detect_heading(lines, blk['max_font_size'])

            if is_sec:
                if current_content_parts:
                    body = self._join_content_parts(current_content_parts)
                    if body:
                        sections.append(ParsedSection(
                            title=current_title,
                            section_name=current_name,
                            section_number=current_num,
                            section_type=current_type,
                            content=body,
                            page_start=current_page_start,
                            page_end=current_page_end
                        ))

                full_title = f"{sec_num} {sec_name}".strip()
                current_title = full_title
                current_name = sec_name
                current_num = sec_num
                current_type = sec_type
                current_page_start = page_num
                current_page_end = page_num
                current_content_parts = []

                rem_lines = lines[2:] if (len(lines) >= 2 and re.match(r'^[1-9]\d?(?:\.\d+){0,2}$', lines[0])) else lines[1:]
                rem_text = self._clean_text('\n'.join(rem_lines))
                if rem_text and not self._is_metadata_or_stamp(rem_text):
                    current_content_parts.append(rem_text)
            else:
                if page_num == 1 and current_name == 'Abstract' and not current_content_parts:
                    if any(k in text.lower() for k in ['google ai', 'university', 'research', 'department', 'author', '@']):
                        continue
                    if 'we introduce' not in text.lower() and 'abstract' not in text.lower() and len(text.split()) < 15:
                        continue
                current_content_parts.append(text)
                current_page_end = page_num

        if current_content_parts:
            body = self._join_content_parts(current_content_parts)
            if body:
                sections.append(ParsedSection(
                    title=current_title,
                    section_name=current_name,
                    section_number=current_num,
                    section_type=current_type,
                    content=body,
                    page_start=current_page_start,
                    page_end=current_page_end
                ))

        if not sections:
            all_text = '\n\n'.join([b['text'] for b in raw_blocks if not self._is_metadata_or_stamp(b['text'])])
            sections.append(ParsedSection(
                title='Abstract',
                section_name='Abstract',
                section_number='',
                section_type='abstract',
                content=all_text,
                page_start=1,
                page_end=raw_blocks[-1]['page_num'] if raw_blocks else 1
            ))

        return sections

    def _join_content_parts(self, parts: List[str]) -> str:
        """Joins text blocks, healing sentences split across page or column breaks."""
        if not parts:
            return ""

        joined = parts[0]
        for part in parts[1:]:
            part_clean = part.strip()
            if not part_clean:
                continue

            last_char = joined.rstrip()[-1] if joined.rstrip() else '.'
            first_char = part_clean[0]

            if last_char not in ['.', '!', '?', ':', ';'] and first_char.islower():
                joined = joined.rstrip() + ' ' + part_clean
            else:
                joined = joined.rstrip() + '\n\n' + part_clean

        return joined.strip()

    def _clean_text(self, text: str) -> str:
        text = unicodedata.normalize('NFKD', text)
        text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', text)
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def _fallback_text_parse(self, file_bytes: bytes, filename: str, file_hash: str, file_size: int) -> ParsedDocument:
        text = file_bytes.decode('utf-8', errors='ignore')
        cleaned = self._clean_text(text)
        title = filename.replace('.txt', '').replace('.md', '').replace('_', ' ').title()
        lines = cleaned.split('\n')
        sections: List[ParsedSection] = []
        current_title = 'Abstract'
        current_name = 'Abstract'
        current_num = ''
        current_type = 'abstract'
        current_lines: List[str] = []

        for line in lines:
            if line.startswith('# ') and len(line) > 3:
                title = line[2:].strip()
            elif line.startswith('## ') and len(line) > 4:
                if current_lines:
                    body = '\n'.join(current_lines).strip()
                    if body:
                        sections.append(ParsedSection(
                            title=current_title,
                            section_name=current_name,
                            section_number=current_num,
                            section_type=current_type,
                            content=body,
                            page_start=1,
                            page_end=1
                        ))
                header_text = line[3:].strip()
                m = re.match(r'^([1-9]\d?(?:\.\d+)*)\s+(.*)$', header_text)
                if m:
                    current_num = m.group(1)
                    current_name = m.group(2).strip()
                else:
                    current_num = ''
                    current_name = header_text
                current_title = header_text
                current_type = self._classify_section_type(current_name, current_num)
                current_lines = []
            else:
                current_lines.append(line)

        if current_lines:
            body = '\n'.join(current_lines).strip()
            if body:
                sections.append(ParsedSection(
                    title=current_title,
                    section_name=current_name,
                    section_number=current_num,
                    section_type=current_type,
                    content=body,
                    page_start=1,
                    page_end=1
                ))

        if not sections:
            sections = [ParsedSection(
                title='Content',
                section_name='Content',
                section_number='',
                section_type='other',
                content=cleaned,
                page_start=1,
                page_end=1
            )]

        doc_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, file_hash))
        metadata = DocumentMetadata(
            document_id=doc_id,
            filename=filename,
            title=title,
            page_count=1,
            file_size_bytes=file_size,
            file_hash=file_hash,
            section_titles=[s.title for s in sections]
        )
        page = ParsedPage(page_number=1, text=cleaned, char_count=len(cleaned))
        return ParsedDocument(metadata=metadata, pages=[page], sections=sections, full_text=cleaned)

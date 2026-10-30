from __future__ import annotations
from dataclasses import dataclass, asdict
import hashlib, re
from bs4 import BeautifulSoup

@dataclass(frozen=True)
class MCQ:
    question: str
    option_a: str | None = None
    option_b: str | None = None
    option_c: str | None = None
    option_d: str | None = None
    answer: str | None = None
    explanation: str | None = None
    source_page: int | None = None

    @property
    def fingerprint(self) -> str:
        s=' '.join((self.question,self.option_a or '',self.option_b or '',self.option_c or '',self.option_d or '')).lower()
        return hashlib.sha256(re.sub(r'\s+',' ',s).strip().encode()).hexdigest()

_OPT=re.compile(r'^\s*[\(\[]?([A-D])\s*[\)\].:-]\s*(.+)$',re.I)
_NUM=re.compile(r'^\s*(\d{1,4})[.)\-:]\s+(.+)$')

class MCQExtractor:
    def extract_html(self, html: str) -> list[dict]:
        soup=BeautifulSoup(html,'html.parser')
        return self.extract_text(soup.get_text('\n'))

    def extract_text(self, text: str) -> list[dict]:
        lines=[re.sub(r'\s+',' ',x).strip() for x in text.splitlines() if x.strip()]
        out=[]; i=0
        while i < len(lines):
            m=_NUM.match(lines[i])
            if not m: i+=1; continue
            question=m.group(2); opts={}; j=i+1
            while j < len(lines) and len(opts)<4:
                om=_OPT.match(lines[j])
                if om: opts[om.group(1).upper()]=om.group(2).strip(); j+=1; continue
                if _NUM.match(lines[j]): break
                if len(question)<1000 and not opts: question+=' '+lines[j]; j+=1; continue
                j+=1
            answer=None; explanation=None
            k=j
            while k < min(len(lines),j+3):
                am=re.match(r'^answer\s*[:.-]\s*([A-D])(?:\s|$)',lines[k],re.I)
                if am: answer=am.group(1).upper(); break
                k+=1
            if len(opts)>=2:
                out.append(asdict(MCQ(question[:4000],opts.get('A'),opts.get('B'),opts.get('C'),opts.get('D'),answer,explanation)))
            i=max(j,i+1)
        return out

    def extract_file(self, path: str) -> list[dict]:
        from pathlib import Path
        p=Path(path)
        if p.suffix.lower() in {'.html','.htm'}: return self.extract_html(p.read_text(errors='replace'))
        if p.suffix.lower()=='.txt': return self.extract_text(p.read_text(errors='replace'))
        if p.suffix.lower()=='.pdf':
            import shutil, subprocess
            if not shutil.which('pdftotext'): return []
            r=subprocess.run(['pdftotext','-layout',str(p),'-'],capture_output=True,text=True,timeout=120)
            return self.extract_text(r.stdout) if r.returncode==0 else []
        return []

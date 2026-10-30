from __future__ import annotations
from dataclasses import dataclass, asdict
from urllib.parse import urlparse
import re

@dataclass(frozen=True)
class Classification:
    exam: str | None
    group_name: str | None
    resource_type: str
    subject: str | None
    confidence: float
    reasons: tuple[str, ...]

class ResourceClassifier:
    def classify(self, title: str, url: str = '', text: str = '') -> dict:
        hay = f'{title} {url} {text}'.lower()
        reasons=[]
        group=None
        if re.search(r'group\s*ii\s*a|group\s*2\s*a|iia', hay): group='TNPSC_GROUP_2A'; reasons.append('group-2a')
        elif re.search(r'group\s*ii|group\s*2(?!\s*a)', hay): group='TNPSC_GROUP_2'; reasons.append('group-2')
        exam='TNPSC' if ('tnpsc' in hay or group) else None
        if exam: reasons.append('tnpsc')
        if any(x in hay for x in ('question paper','question_paper','question-papers','previous year','pyq')): typ='question_paper'; reasons.append('question-paper')
        elif any(x in hay for x in ('mock test','mock exam','online test')): typ='mock_test'; reasons.append('mock-test')
        elif any(x in hay for x in ('mcq','multiple choice','practice test','practice questions')): typ='mcq'; reasons.append('mcq')
        elif 'syllabus' in hay: typ='syllabus'; reasons.append('syllabus')
        elif any(x in hay for x in ('study material','study materials','lesson','notes','pdf')): typ='study_material'; reasons.append('study-material')
        else: typ='other'
        subject=None
        for name in ('general studies','aptitude','mental ability','english','general tamil','current affairs','polity','history','geography','economy','science'):
            if name in hay: subject=name; reasons.append(f'subject:{name}'); break
        score=min(0.99, 0.45 + 0.12*len(reasons)) if reasons else 0.05
        return asdict(Classification(exam, group, typ, subject, round(score,2), tuple(reasons)))

import type { ResourceItem } from '../types';

export const resources: ResourceItem[] = [
  {
    id: 'res-1',
    title: 'TNPSC Group 2 Syllabus & Blueprint PDF (2025-2026)',
    type: 'Download', category: 'Syllabus', sizeOrDomain: '4.8 MB .pdf', url: '#download-syllabus',
    description: 'Official updated curriculum map, unit-wise weightage, and topic distribution guidelines.',
  },
  {
    id: 'res-2',
    title: 'Aptitude Formulas & Mental Math Quick Cards',
    type: 'Download', category: 'Cheat Sheet', sizeOrDomain: '2.5 MB .pdf', url: '#download-aptitude',
    description: 'High-yield formula cheat sheet covering Percentages, HCF-LCM, Time & Work, and Mensuration.',
  },
  {
    id: 'res-3',
    title: 'TNPSC Official Portal & Notifications',
    type: 'Link', category: 'Official Portal', sizeOrDomain: 'tnpsc.gov.in', url: 'https://www.tnpsc.gov.in/',
    description: 'Official announcements, hall tickets, syllabus bulletins, and result portal.',
  },
];

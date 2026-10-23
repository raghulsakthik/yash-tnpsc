import type { ResourceItem } from '../types';

// Real external links only -- no fabricated "Download" placeholders.
// Real downloadable resources come from the backend (src/api/novaApi.ts's
// resources()), which only lists what an admin has actually uploaded.
export const resources: ResourceItem[] = [
  {
    id: 'res-3',
    title: 'TNPSC Official Portal & Notifications',
    type: 'Link', category: 'Official Portal', sizeOrDomain: 'tnpsc.gov.in', url: 'https://www.tnpsc.gov.in/',
    description: 'Official announcements, hall tickets, syllabus bulletins, and result portal.',
  },
];

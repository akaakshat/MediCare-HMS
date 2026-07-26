import { PRIORITY_VALUES } from './constants';

export type QueuePriority = (typeof PRIORITY_VALUES)[number];

const PRIORITY_RANK: Record<QueuePriority, number> = {
  Emergency: 1,
  Urgent: 2,
  Normal: 3,
  Routine: 4,
};

export const normalizePriority = (value?: string | null): QueuePriority => {
  const normalized = String(value || '').trim();
  if (normalized in PRIORITY_RANK) {
    return normalized as QueuePriority;
  }
  return 'Normal';
};

export const getPriorityRank = (value?: string | null): number => PRIORITY_RANK[normalizePriority(value)];

export const getPriorityBadge = (value?: string | null) => {
  const priority = normalizePriority(value);
  switch (priority) {
    case 'Emergency':
      return { label: 'Emergency', className: 'bg-red-100 text-red-700' };
    case 'Urgent':
      return { label: 'Urgent', className: 'bg-orange-100 text-orange-700' };
    case 'Routine':
      return { label: 'Routine', className: 'bg-green-100 text-green-700' };
    default:
      return { label: 'Normal', className: 'bg-yellow-100 text-yellow-700' };
  }
};

import { PaymentStatus, Language } from '../types';

// Payment status has its own display wording, separate from any other enum
// that happens to share a "Pending" value (e.g. MilestoneStatus.Pending) -
// centralized here so every screen shows the same three labels instead of
// each component's local translation table drifting apart.
const LABELS: Record<Language, Record<PaymentStatus, string>> = {
  ar: {
    [PaymentStatus.Pending]: 'لم تصدر',
    [PaymentStatus.Sent]: 'صدرت وأُرسلت',
    [PaymentStatus.Paid]: 'مستقرة',
  },
  en: {
    [PaymentStatus.Pending]: 'Not Issued',
    [PaymentStatus.Sent]: 'Issued & Sent',
    [PaymentStatus.Paid]: 'Settled',
  },
};

export const getPaymentStatusLabel = (status: PaymentStatus | null | undefined, language: Language): string => {
  if (!status) return '';
  return LABELS[language][status] || status;
};

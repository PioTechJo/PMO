export type ContractRiskStatus = 'active' | 'renewal-due' | 'expired';

// endDate null/future beyond the renewal window = active; within the window
// but not yet past = renewal-due; past = expired. Mirrors the "is active"
// check that used to live inline in MaintenanceContracts.tsx.
export const getContractRiskStatus = (endDate: string | null, renewalWindowDays = 30): ContractRiskStatus => {
    if (!endDate) return 'active';
    const end = new Date(endDate);
    const now = new Date();
    if (end < now) return 'expired';
    const renewalThreshold = new Date(now.getTime() + renewalWindowDays * 24 * 60 * 60 * 1000);
    if (end <= renewalThreshold) return 'renewal-due';
    return 'active';
};

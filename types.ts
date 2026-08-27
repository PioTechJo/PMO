
export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark' | 'system';
export type View = 'myTasks' | 'dashboard' | 'tasksOverview' | 'paymentsTargetsDashboard' | 'projects' | 'milestones' | 'team' | 'payments' | 'system' | 'maintenanceContracts' | 'maintenanceOverview' | 'filter' | 'reports' | 'issues' | 'customers';
export type ActivityLogType = 'call' | 'meeting' | 'email' | 'visit' | 'other';
export type GroupingType = 'project' | 'assignee';
export type TaskViewMode = 'byProject' | 'byAssignee';

export interface Lookup {
    id: string;
    name: string;
}

export interface User {
    id:string;
    name: string;
    avatarUrl?: string;
    type?: string; // Roles: 'PM', 'PS', 'Staff', 'Client', 'Manager'
    department?: string | null;
    email?: string | null;
}

export interface RolePermissions {
    role: string;
    allowedViews: View[];
}

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'issue_assigned' | 'status_change' | 'milestone_alert' | 'milestone_change_requested' | 'milestone_change_result';
    isRead: boolean;
    createdAt: string;
    linkId?: string;
}

export interface MilestoneChangeRequest {
    id: string;
    milestoneId: string;
    requestedBy: string;
    requestedDate: string;
    oldDueDate: string | null;
    newDueDate: string | null;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string | null;
    approvalDate?: string | null;
    rejectionReason?: string | null;
    requesterName?: string;
    milestoneTitle?: string;
    projectId?: string;
    projectCode?: string;
    projectName?: string;
    milestoneAmount?: number;
}

export interface MilestoneAuditLog {
    id: string;
    milestoneId: string;
    userId: string;
    action: string;
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string;
    userName?: string;
}

export interface MilestoneUpdate {
    id: string;
    milestoneId: string;
    userId: string;
    updateText: string;
    createdAt: string;
    user?: User;
}

export interface IssueComment {
    id: string;
    issueId: string;
    userId: string;
    content: string;
    createdAt: string;
    user?: User;
}

export type CustomerTier = 'VIP' | 'Standard' | 'Other';
export type CustomerStatus = 'active' | 'prospect' | 'churned';

export interface Customer {
    id: string;
    name: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    industry: string | null;
    tier: CustomerTier;
    status: CustomerStatus;
    ownerId: string | null;
    owner?: User;
}

export interface CustomerContact {
    id: string;
    customerId: string;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    isPrimary: boolean;
}

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN';

export interface AuditLogEntry {
    id: string;
    tableName: string;
    recordId: string | null;
    action: AuditAction;
    changedBy: string | null;
    oldData: Record<string, any> | null;
    newData: Record<string, any> | null;
    createdAt: string;
    user?: User;
}

export interface Lookups {
    countries: Lookup[];
    categories: Lookup[];
    teams: Lookup[];
    products: Lookup[];
    projectStatuses: Lookup[];
    projectManagers: User[];
    customers: Customer[];
}

export enum MilestoneStatus {
    Pending = 'Pending',
    InProgress = 'In Progress',
    Completed = 'Completed',
}

export enum PaymentStatus {
    Pending = 'Pending',
    Sent = 'Sent',
    Paid = 'Paid',
}

export enum PaymentType {
    Downpayment = 'Downpayment',
    Progress = 'Progress',
    Final = 'Final',
    Retention = 'Retention',
    Other = 'Other'
}

export enum IssueStatus {
    Open = 'Open',
    InProgress = 'In Progress',
    Resolved = 'Resolved',
    Closed = 'Closed'
}

export enum IssuePriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
    Critical = 'Critical'
}

export interface Milestone {
    id: string;
    title: string;
    description: string | null;
    projectId: string;
    teamId: string | null;
    dueDate: string | null;
    status: MilestoneStatus;
    hasPayment: boolean;
    paymentAmount: number;
    paymentStatus: PaymentStatus | null;
    paymentType: PaymentType | null;
}

export interface Issue {
    id: string;
    title: string;
    description: string;
    status: IssueStatus;
    priority: IssuePriority;
    projectId: string;
    milestoneId: string | null;
    assigneeId: string | null;
    reporterId: string;
    createdAt: string;
    expectedDuration?: number | null;
    estimatedHours?: number | null;
    completedAt?: string | null;
    productId?: string | null;
    project?: Project;
    milestone?: Milestone;
    assignee?: User;
    reporter?: User;
    product?: Lookup;
    comments?: IssueComment[];
}

export interface Project {
    id: string;
    name: string;
    description: string;
    projectCode: string;
    countryId: string | null;
    categoryId: string | null;
    teamId: string | null;
    productId: string | null;
    productIds?: string[];
    statusId: string | null;
    projectManagerId: string | null;
    customerId: string | null;
    launchDate: string | null;
    actualStartDate: string | null;
    expectedClosureDate: string | null;
    progress: number;
    revenueImpact: number;
    strategicValue: number;
    deliveryRisk: number;
    customerPressure: number;
    resourceLoad: number;
    country?: Lookup;
    category?: Lookup;
    team?: Lookup;
    product?: Lookup;
    products?: Lookup[];
    status?: Lookup;
    projectManager?: User;
    customer?: Lookup;
}

export interface CustomerActivityLog {
    id: string;
    customerId: string;
    type: ActivityLogType;
    note: string;
    createdBy: string;
    createdAt: string;
    user?: User;
}

export interface MaintenanceContract {
    id: string;
    createdAt: string;
    type: string | null;
    month: number | null;
    year: number;
    customerId: string;
    projectCode: string | null;
    totalAmount: number;
    collectedAmount: number;
    lostAmount: number;
    startDate: string | null;
    endDate: string | null;
    notes: string | null;
    customer?: Lookup;
}

export interface AnalysisResult {
    resultType: 'PROJECTS' | 'MILESTONES' | 'SUMMARY' | 'KPIS' | 'ERROR';
    projects?: { id: string }[];
    milestones?: { id: string }[];
    summary?: string;
    kpis?: { title: string; value: string }[];
    error?: string;
}

export interface ProjectImportRow {
    name: string;
    description?: string;
    customerName: string;
    projectManagerName: string;
    statusName: string;
    countryName?: string;
    categoryName?: string;
    teamName?: string;
    productName?: string;
    launchDate?: string;
    actualStartDate?: string;
    expectedClosureDate?: string;
    progress?: string;
}


export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark' | 'system';
export type View = 'dashboard' | 'projects' | 'milestones' | 'team' | 'payments' | 'system' | 'maintenanceContracts' | 'filter' | 'reports';

export interface Lookup {
    id: string;
    name: string;
}

export interface User {
    id:string;
    name: string;
    avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

export interface MilestoneUpdate {
    id: string;
    milestoneId: string;
    userId: string;
    updateText: string;
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
    customers: Lookup[];
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

export interface Milestone {
    id: string;
    title: string;
    description: string;
    projectId: string;
    teamId: string | null;
    dueDate: string | null; // ISO string
    status: MilestoneStatus;
    hasPayment: boolean;
    paymentAmount: number;
    paymentStatus: PaymentStatus | null;
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
    statusId: string | null;
    projectManagerId: string | null;
    customerId: string | null;
    launchDate: string | null;
    actualStartDate: string | null;
    expectedClosureDate: string | null;
    progress: number;
    // Weight Fields
    revenueImpact: number;
    strategicValue: number;
    deliveryRisk: number;
    customerPressure: number;
    resourceLoad: number;
    // Expanded properties from lookups
    country?: Lookup;
    category?: Lookup;
    team?: Lookup;
    product?: Lookup;
    status?: Lookup;
    projectManager?: User;
    customer?: Lookup;
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
    // Expanded properties for display
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
    [key: string]: string | undefined;
    name: string;
    description?: string;
    customerName: string;
    projectManagerName: string;
    statusName: string;
    countryName?: string;
    categoryName?: string;
    teamName?: string;
    productName?: string;
    launchDate?: string; // YYYY-MM-DD
    actualStartDate?: string; // YYYY-MM-DD
    expectedClosureDate?: string; // YYYY-MM-DD
    progress?: string; // number as string
}

export interface MaintenanceContractImportRow {
    [key: string]: string | undefined;
    type?: string;
    month: string; // number as string
    year: string; // number as string
    customerName: string;
    projectCode: string;
    totalAmount: string; // number as string
    collectedAmount?: string; // number as string
    lostAmount?: string; // number as string
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    notes?: string;
}

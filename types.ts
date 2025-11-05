export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark' | 'system';
export type View = 'dashboard' | 'projects' | 'activities' | 'team' | 'payments' | 'system';

export interface Lookup {
    id: string;
    name: string;
}

export interface User {
    id: string;
    name: string;
    avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

export interface ActivityUpdate {
    id: string;
    activityId: string;
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

export enum ActivityStatus {
    Completed = 'Completed',
    InProgress = 'In Progress',
    Pending = 'Pending',
}

export enum PaymentStatus {
    Paid = 'Paid',
    Sent = 'Sent',
    Pending = 'Pending',
}

export interface Activity {
    id: string;
    title: string;
    description: string;
    projectId: string;
    teamId: string | null;
    dueDate: string | null; // ISO string
    status: ActivityStatus;
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
    // Expanded properties from lookups
    country?: Lookup;
    category?: Lookup;
    team?: Lookup;
    product?: Lookup;
    status?: Lookup;
    projectManager?: User;
    customer?: Lookup;
}

export interface AnalysisResult {
    resultType: 'PROJECTS' | 'ACTIVITIES' | 'SUMMARY' | 'KPIS' | 'ERROR';
    projects?: { id: string }[];
    activities?: { id: string }[];
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

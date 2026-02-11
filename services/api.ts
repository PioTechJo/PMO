
import { getSupabase } from './supabaseClient';
import { Project, Milestone, User, Lookups, MilestoneStatus, PaymentStatus } from '../types';

const mapMilestoneToDb = (milestoneData: Partial<Omit<Milestone, 'id'>>) => {
    const { projectId, teamId, dueDate, hasPayment, paymentAmount, paymentStatus, title, description, status } = milestoneData;
    const dbData: any = {};
    if (title !== undefined) dbData.title = title;
    if (description !== undefined) dbData.description = description;
    if (status !== undefined) dbData.status = status;
    if (projectId !== undefined) dbData.project_id = projectId || null;
    if (teamId !== undefined) dbData.team_id = teamId || null;
    if (dueDate !== undefined) dbData.due_date = dueDate;
    if (hasPayment !== undefined) dbData.has_payment = hasPayment;
    if (paymentAmount !== undefined) dbData.payment_amount = paymentAmount;
    if (paymentStatus !== undefined) dbData.payment_status = paymentStatus;
    return dbData;
};

const mapDbToMilestone = (dbMilestone: any): Milestone => ({
    id: dbMilestone.id,
    title: dbMilestone.title || '',
    description: dbMilestone.description || '',
    projectId: dbMilestone.project_id,
    teamId: dbMilestone.team_id,
    dueDate: dbMilestone.due_date,
    status: (dbMilestone.status || MilestoneStatus.Pending) as MilestoneStatus,
    hasPayment: !!dbMilestone.has_payment,
    paymentAmount: dbMilestone.payment_amount || 0,
    paymentStatus: dbMilestone.payment_status as PaymentStatus,
});

const mapProjectToDb = (projectData: Partial<Omit<Project, 'id'>>) => {
    const { projectCode, countryId, categoryId, teamId, productId, statusId, projectManagerId, customerId, launchDate, actualStartDate, expectedClosureDate, progress, revenueImpact, strategicValue, deliveryRisk, customerPressure, resourceLoad, ...rest } = projectData;
    const dbData: any = { ...rest };
    if (projectCode !== undefined) dbData.project_code = projectCode;
    if (countryId !== undefined) dbData.country_id = countryId || null;
    if (categoryId !== undefined) dbData.category_id = categoryId || null;
    if (teamId !== undefined) dbData.team_id = teamId || null;
    if (productId !== undefined) dbData.product_id = productId || null;
    if (statusId !== undefined) dbData.status_id = statusId || null;
    if (projectManagerId !== undefined) dbData.project_manager_id = projectManagerId || null;
    if (customerId !== undefined) dbData.customer_id = customerId || null;
    if (launchDate !== undefined) dbData.launch_date = launchDate;
    if (actualStartDate !== undefined) dbData.actual_start_date = actualStartDate;
    if (expectedClosureDate !== undefined) dbData.expected_closure_date = expectedClosureDate;
    if (progress !== undefined) dbData.progress = progress;
    if (revenueImpact !== undefined) dbData.revenue_impact = revenueImpact;
    if (strategicValue !== undefined) dbData.strategic_value = strategicValue;
    if (deliveryRisk !== undefined) dbData.delivery_risk = deliveryRisk;
    if (customerPressure !== undefined) dbData.customer_pressure = customerPressure;
    if (resourceLoad !== undefined) dbData.resource_load = resourceLoad;
    return dbData;
};

const mapDbToProject = (dbProject: any): Project => ({
    id: dbProject.id,
    name: dbProject.name || 'Untitled',
    description: dbProject.description || '',
    projectCode: dbProject.project_code || 'N/A',
    countryId: dbProject.country_id,
    categoryId: dbProject.category_id,
    teamId: dbProject.team_id,
    productId: dbProject.product_id,
    statusId: dbProject.status_id,
    projectManagerId: dbProject.project_manager_id,
    customerId: dbProject.customer_id,
    launchDate: dbProject.launch_date,
    actualStartDate: dbProject.actual_start_date,
    expectedClosureDate: dbProject.expected_closure_date,
    progress: dbProject.progress || 0,
    revenueImpact: dbProject.revenue_impact || 1,
    strategicValue: dbProject.strategic_value || 1,
    deliveryRisk: dbProject.delivery_risk || 1,
    customerPressure: dbProject.customer_pressure || 1,
    resourceLoad: dbProject.resource_load || 1,
});

export const fetchAllData = async () => {
    const supabase = getSupabase();
    if (!supabase) return { projects: [], milestones: [], users: [], lookups: null };

    const fetchRes = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('activities').select('*'),
        supabase.from('users').select('*'),
        supabase.from('countries').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('products').select('*'),
        supabase.from('project_statuses').select('*'),
        supabase.from('customers').select('*')
    ]);

    const results = fetchRes.map(r => r.data || []);
    const [prj, mls, usr, cnt, cat, tm, prd, st, cst] = results;

    const lookups: Lookups = {
        countries: cnt, categories: cat, teams: tm, products: prd, projectStatuses: st,
        projectManagers: (usr as User[]) || [], customers: cst,
    };

    const projects: Project[] = prj.map(db => {
        const p = mapDbToProject(db);
        return {
            ...p,
            status: lookups.projectStatuses.find(l => l.id === p.statusId),
            projectManager: lookups.projectManagers.find(l => l.id === p.projectManagerId),
            customer: lookups.customers.find(l => l.id === p.customerId),
        };
    });

    return { projects, milestones: mls.map(mapDbToMilestone), users: (usr as User[]), lookups };
};

export const addMilestones = async (milestonesData: Omit<Milestone, 'id'>[]) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const toInsert = milestonesData.map(mapMilestoneToDb);
    const { data, error } = await supabase.from('activities').insert(toInsert).select();
    if (error) throw error;
    return (data || []).map(mapDbToMilestone);
};

export const updateMilestone = async (id: string, milestoneData: Partial<Omit<Milestone, 'id'>>) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const dbData = mapMilestoneToDb(milestoneData);
    const { data, error } = await supabase.from('activities').update(dbData).eq('id', id).select();
    if (error) throw error;
    return data && data[0] ? mapDbToMilestone(data[0]) : null;
};

export const addProject = async (projectData: any) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    
    // Auto-generate project code if missing
    if (!projectData.projectCode) {
        projectData.projectCode = `PRJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const { data, error } = await supabase.from('projects').insert([mapProjectToDb(projectData)]).select();
    if (error) throw error;
    return mapDbToProject(data[0]);
};

export const updateProject = async (id: string, projectData: any) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase.from('projects').update(mapProjectToDb(projectData)).eq('id', id).select();
    if (error) throw error;
    return mapDbToProject(data[0]);
};

export const deleteProject = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
};

export const updateLookups = async (type: keyof Lookups, items: any[]) => {};
export const addMilestoneUpdate = async (data: any) => {};

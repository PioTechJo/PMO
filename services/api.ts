
import { getSupabase } from './supabaseClient';
import { Project, Activity, User, Lookups, Lookup, ActivityUpdate } from '../types';

// --- Data Mapper Utilities ---

const mapActivityToDb = (activityData: Partial<Omit<Activity, 'id'>>) => {
    const {
        projectId, teamId, dueDate, hasPayment, paymentAmount, paymentStatus, ...rest
    } = activityData;
    const dbData: any = { ...rest };
    if (projectId !== undefined) dbData.project_id = projectId || null;
    if (teamId !== undefined) dbData.team_id = teamId || null;
    if (dueDate !== undefined) dbData.due_date = dueDate;
    if (hasPayment !== undefined) dbData.has_payment = hasPayment;
    if (paymentAmount !== undefined) dbData.payment_amount = paymentAmount;
    if (paymentStatus !== undefined) dbData.payment_status = paymentStatus;
    return dbData;
};

const mapDbToActivity = (dbActivity: any): Activity => {
    const {
        project_id, team_id, due_date, has_payment, payment_amount, payment_status, ...rest
    } = dbActivity;
    return {
        ...rest,
        projectId: project_id,
        teamId: team_id,
        dueDate: due_date,
        hasPayment: has_payment,
        paymentAmount: payment_amount,
        paymentStatus: payment_status,
    } as Activity;
};

const mapActivityUpdateToDb = (updateData: Partial<Omit<ActivityUpdate, 'id' | 'createdAt' | 'user'>>) => {
    const { activityId, userId, updateText, ...rest } = updateData;
    const dbData: any = { ...rest };
    if (activityId !== undefined) dbData.activity_id = activityId;
    if (userId !== undefined) dbData.user_id = userId;
    if (updateText !== undefined) dbData.update_text = updateText;
    return dbData;
};

const mapDbToActivityUpdate = (dbUpdate: any): ActivityUpdate => {
    const { activity_id, user_id, update_text, created_at, ...rest } = dbUpdate;
    return {
        ...rest,
        activityId: activity_id,
        userId: user_id,
        updateText: update_text,
        createdAt: created_at,
    } as ActivityUpdate;
};


const mapProjectToDb = (projectData: Partial<Omit<Project, 'id'>>) => {
    const {
        projectCode, countryId, categoryId, teamId, productId, statusId, projectManagerId, customerId,
        launchDate, actualStartDate, expectedClosureDate, progress,
        country, category, team, product, status, projectManager, customer,
        ...rest
    } = projectData;
    const dbData: any = { ...rest };
    // Project code is set on creation and should be immutable.
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
    return dbData;
};

const mapDbToProject = (dbProject: any): Omit<Project, 'country' | 'category' | 'team' | 'product' | 'status' | 'projectManager' | 'customer'> => {
    const {
        project_code, country_id, category_id, team_id, product_id, status_id, project_manager_id, customer_id,
        launch_date, actual_start_date, expected_closure_date, progress,
        ...rest
    } = dbProject;
    return {
        ...rest,
        projectCode: project_code,
        countryId: country_id,
        categoryId: category_id,
        teamId: team_id,
        productId: product_id,
        statusId: status_id,
        projectManagerId: project_manager_id,
        customerId: customer_id,
        launchDate: launch_date,
        actualStartDate: actual_start_date,
        expectedClosureDate: expected_closure_date,
        progress: progress ?? 0,
    } as Project;
};

/**
 * Generates a unique, human-readable project code.
 * @param projectName The name of the new project.
 * @returns A project code string (e.g., "CRM-1234").
 */
const generateProjectCode = (projectName: string): string => {
    const prefix = projectName.replace(/[^a-zA-Z\s]/g, '').split(' ').map(word => word.charAt(0)).join('').substring(0, 3).toUpperCase();
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    return `${prefix || 'PRJ'}-${randomNumber}`;
};


// --- API Functions ---

export const fetchAllData = async () => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");

    const [
        { data: projectsData, error: projectsError },
        { data: activitiesData, error: activitiesError },
        { data: usersData, error: usersError },
        { data: activityUpdatesData, error: activityUpdatesError },
        { data: countries, error: countriesError },
        { data: categories, error: categoriesError },
        { data: teams, error: teamsError },
        { data: products, error: productsError },
        { data: projectStatuses, error: projectStatusesError },
        { data: customers, error: customersError }
    ] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('activities').select('*'),
        supabase.from('users').select('*'),
        supabase.from('activity_updates').select('*').order('created_at', { ascending: false }),
        supabase.from('countries').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('products').select('*'),
        supabase.from('project_statuses').select('*'),
        supabase.from('customers').select('*')
    ]);

    if (projectsError) throw projectsError;
    if (activitiesError) throw activitiesError;
    if (usersError) throw usersError;
    if (activityUpdatesError) throw activityUpdatesError;
    if (countriesError) throw countriesError;
    if (categoriesError) throw categoriesError;
    if (teamsError) throw teamsError;
    if (productsError) throw productsError;
    if (projectStatusesError) throw projectStatusesError;
    if (customersError) throw customersError;

    const sortByName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

    const lookups: Lookups = {
        countries: (countries || []).sort(sortByName),
        categories: (categories || []).sort(sortByName),
        teams: (teams || []).sort(sortByName),
        products: (products || []).sort(sortByName),
        projectStatuses: (projectStatuses || []).sort(sortByName),
        projectManagers: ((usersData as User[]) || []).sort(sortByName),
        customers: (customers || []).sort(sortByName),
    };
    
    const projects: Project[] = (projectsData || []).map((dbProject: any) => {
        const p = mapDbToProject(dbProject);
        return {
            ...p,
            country: lookups.countries.find(l => l.id === p.countryId),
            category: lookups.categories.find(l => l.id === p.categoryId),
            team: lookups.teams.find(l => l.id === p.teamId),
            product: lookups.products.find(l => l.id === p.productId),
            status: lookups.projectStatuses.find(l => l.id === p.statusId),
            projectManager: lookups.projectManagers.find(l => l.id === p.projectManagerId),
            customer: lookups.customers.find(l => l.id === p.customerId),
        };
    }).sort(sortByName);

    return {
        projects,
        activities: (activitiesData || []).map(mapDbToActivity),
        users: (usersData as User[] || []),
        activityUpdates: (activityUpdatesData || []).map(mapDbToActivityUpdate),
        lookups
    };
};

export const addProject = async (projectData: Omit<Project, 'id' | 'projectCode' | 'country' | 'category' | 'team' | 'product' | 'status' | 'projectManager' | 'customer'>) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");

    const projectCode = generateProjectCode(projectData.name);
    const projectDataWithCode = { ...projectData, projectCode };
    
    const dbProjectData = mapProjectToDb(projectDataWithCode);

    const { data, error } = await supabase.from('projects').insert([dbProjectData]).select();
    if (error) throw error;
    return mapDbToProject(data[0]) as Project;
};

export const addProjects = async (projectsData: Omit<Project, 'id' | 'projectCode' | 'country' | 'category' | 'team' | 'product' | 'status' | 'projectManager' | 'customer'>[]) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");

    if (projectsData.length === 0) return [];

    const projectsToInsert = projectsData.map(p => mapProjectToDb({
        ...p,
        projectCode: generateProjectCode(p.name)
    }));

    const { data, error } = await supabase.from('projects').insert(projectsToInsert).select();
    if (error) throw error;
    return (data || []).map(p => mapDbToProject(p) as Project);
};

export const updateProject = async (projectId: string, projectData: Omit<Project, 'id' | 'projectCode' | 'country' | 'category' | 'team' | 'product' | 'status' | 'projectManager' | 'customer'>) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    
    // Ensure project_code is not part of the update payload, making it immutable.
    const dbProjectData = mapProjectToDb(projectData);
    delete dbProjectData.project_code;

    const { data, error } = await supabase.from('projects').update(dbProjectData).eq('id', projectId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Project not found or update failed.");
    return mapDbToProject(data[0]) as Project;
};

export const deleteProject = async (projectId: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
};

export const addActivities = async (activitiesData: Omit<Activity, 'id'>[]) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const activitiesToInsert = activitiesData.map(mapActivityToDb);
    const { data, error } = await supabase.from('activities').insert(activitiesToInsert).select();
    if (error) throw error;
    return (data || []).map(mapDbToActivity);
};

export const updateActivity = async (activityId: string, activityData: Partial<Omit<Activity, 'id'>>) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const dbActivityData = mapActivityToDb(activityData);
    const { data, error } = await supabase.from('activities').update(dbActivityData).eq('id', activityId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Activity not found or update failed.");
    return mapDbToActivity(data[0]);
};

export const addActivityUpdate = async (updateData: Omit<ActivityUpdate, 'id' | 'createdAt' | 'user'>) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    
    const dbUpdateData = mapActivityUpdateToDb(updateData);
    
    const { data, error } = await supabase.from('activity_updates').insert([dbUpdateData]).select();
    if (error) throw error;
    return mapDbToActivityUpdate(data[0]);
};

export const updateLookups = async (lookupType: keyof Lookups, newLookups: Lookup[]) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");

    const tableNameMap = {
        countries: 'countries', categories: 'categories', teams: 'teams',
        products: 'products', projectStatuses: 'project_statuses', customers: 'customers',
    };

    const tableName = tableNameMap[lookupType as keyof typeof tableNameMap];
    if (!tableName) throw new Error(`Updating ${String(lookupType)} is not supported.`);

    const { data: existing } = await supabase.from(tableName).select('id');
    const existingIds = (existing || []).map(e => e.id);
    const newIds = newLookups.map(n => n.id);
    
    const toDelete = existingIds.filter(id => !newIds.includes(id));
    const toUpdate = newLookups.filter(n => existingIds.includes(n.id));
    const toInsert = newLookups.filter(n => !existingIds.includes(n.id));

    if (toDelete.length > 0) {
        const { error } = await supabase.from(tableName).delete().in('id', toDelete);
        if (error) throw error;
    }
    if (toUpdate.length > 0) {
        // Using explicit updates in a loop is more robust than a single upsert for this case.
        for (const item of toUpdate) {
            const { error } = await supabase.from(tableName).update({ name: item.name }).eq('id', item.id);
            if (error) throw error;
        }
    }
    if (toInsert.length > 0) {
        const { error } = await supabase.from(tableName).insert(toInsert);
        if (error) throw error;
    }
};

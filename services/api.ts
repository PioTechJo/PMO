
import { getSupabase } from './supabaseClient';
import { Project, Milestone, User, Lookups, MilestoneStatus, PaymentStatus, MaintenanceContract, Issue, IssueStatus, IssuePriority, Notification, Lookup, IssueComment, MilestoneChangeRequest, MilestoneAuditLog } from '../types';

const mapDbToNotification = (db: any): Notification => ({
    id: db.id,
    userId: db.user_id,
    title: db.title,
    message: db.message,
    type: db.type,
    isRead: db.is_read,
    createdAt: db.created_at,
    linkId: db.link_id
});

export const fetchAllData = async () => {
    const supabase = getSupabase();
    if (!supabase) return { projects: [], milestones: [], users: [], lookups: null, maintenanceContracts: [], issues: [], notifications: [] };

    const { data: { session } } = await supabase.auth.getSession();

    const fetchRes = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('activities').select('*'),
        supabase.from('users').select('*'),
        supabase.from('countries').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('products').select('*'),
        supabase.from('project_statuses').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('maintenance_contracts').select('*'),
        supabase.from('issues').select('*'),
        supabase.from('issue_comments').select('*').order('created_at', { ascending: true }),
        session ? supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] })
    ]);

    const results = fetchRes.map(r => r.data || []);
    const [prj, mls, usr, cnt, cat, tm, prd, st, cst, mnt, iss, cmts, ntf] = results;

    const mappedUsers: User[] = (usr as any[] || []).map(u => ({
        id: u.id,
        name: u.name || 'Anonymous User',
        avatarUrl: u.avatar_url,
        type: (u.role === 'Manager' || u.type === 'Manager') ? 'Manager' : (u.type || u.role || 'Staff')
    }));

    const lookups: Lookups = {
        countries: cnt, 
        categories: cat, 
        teams: tm, 
        products: prd, 
        projectStatuses: st,
        projectManagers: mappedUsers.filter(u => u.type === 'PM'),
        customers: cst,
    };

    const projects: Project[] = prj.map(db => {
        const p = {
            id: db.id,
            name: db.name || 'Untitled',
            description: db.description || '',
            projectCode: db.project_code || 'N/A',
            countryId: db.country_id,
            categoryId: db.category_id,
            teamId: db.team_id,
            productId: db.product_id,
            statusId: db.status_id,
            projectManagerId: db.project_manager_id,
            customerId: db.customer_id,
            launchDate: db.launch_date,
            actualStartDate: db.actual_start_date,
            expectedClosureDate: db.expected_closure_date,
            progress: db.progress || 0,
            revenueImpact: db.revenue_impact || 1,
            strategicValue: db.strategic_value || 1,
            deliveryRisk: db.delivery_risk || 1,
            customerPressure: db.customer_pressure || 1,
            resourceLoad: db.resource_load || 1,
        } as Project;
        return {
            ...p,
            status: lookups.projectStatuses.find(l => l.id === p.statusId),
            projectManager: mappedUsers.find(l => l.id === p.projectManagerId),
            customer: lookups.customers.find(l => l.id === p.customerId),
            country: lookups.countries.find(l => l.id === p.countryId),
            category: lookups.categories.find(l => l.id === p.categoryId),
            team: lookups.teams.find(l => l.id === p.teamId),
            product: lookups.products.find(l => l.id === p.productId),
        };
    });

    const mappedComments: IssueComment[] = cmts.map((c: any) => ({
        id: c.id,
        issueId: c.issue_id,
        userId: c.user_id,
        content: c.content,
        createdAt: c.created_at,
        user: mappedUsers.find(u => u.id === c.user_id)
    }));

    return { 
        projects, 
        milestones: mls.map(db => ({
            id: db.id, title: db.title || '', description: db.description || '', projectId: db.project_id, teamId: db.team_id, dueDate: db.due_date, status: (db.status || MilestoneStatus.Pending) as MilestoneStatus, hasPayment: !!db.has_payment, paymentAmount: db.payment_amount || 0, paymentStatus: db.payment_status as PaymentStatus,
        })), 
        users: mappedUsers, 
        lookups,
        maintenanceContracts: mnt.map(db => ({
            id: db.id, createdAt: db.created_at, type: db.type, month: db.month, year: db.year, customerId: db.customer_id, projectCode: db.project_code, totalAmount: db.total_amount || 0, collectedAmount: db.collected_amount || 0, lostAmount: db.lost_amount || 0, startDate: db.start_date, endDate: db.end_date, notes: db.notes, customer: lookups.customers.find(l => l.id === db.customer_id)
        })),
        issues: iss.map(db => ({
            id: db.id, 
            title: db.title, 
            description: db.description || '', 
            status: (db.status || IssueStatus.Open) as IssueStatus, 
            priority: (db.priority || IssuePriority.Medium) as IssuePriority, 
            projectId: db.project_id, 
            milestoneId: db.milestone_id, 
            assigneeId: db.assignee_id, 
            reporterId: db.reporter_id, 
            createdAt: db.created_at,
            expectedDuration: db.expected_duration,
            project: projects.find(p => p.id === db.project_id), 
            assignee: mappedUsers.find(u => u.id === db.assignee_id), 
            reporter: mappedUsers.find(u => u.id === db.reporter_id),
            comments: mappedComments.filter(c => c.issueId === db.id)
        })),
        notifications: ntf.map(mapDbToNotification)
    };
};

// These three functions delegate to Postgres RPCs (see
// supabase/migrations/20260714120000_maker_checker_rls_fix.sql) so the
// request/audit-log/notification writes happen atomically and the Manager
// role check for approve/reject is enforced server-side, not just in the UI.
export const requestMilestoneChange = async (req: Omit<MilestoneChangeRequest, 'id' | 'requestedDate' | 'status'>) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase.rpc('request_milestone_change', {
        p_milestone_id: req.milestoneId,
        p_new_due_date: req.newDueDate,
        p_reason: req.reason
    });
    if (error) throw error;
    return data;
};

export const approveMilestoneChange = async (requestId: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase.rpc('resolve_milestone_change_request', {
        p_request_id: requestId,
        p_decision: 'approved'
    });
    if (error) throw error;
    return data;
};

export const rejectMilestoneChange = async (requestId: string, reason: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase.rpc('resolve_milestone_change_request', {
        p_request_id: requestId,
        p_decision: 'rejected',
        p_rejection_reason: reason
    });
    if (error) throw error;
    return data;
};

export const fetchMilestoneChangeRequests = async () => {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase.from('milestone_change_requests')
        .select(`
            *, 
            activities(title, project_id, payment_amount, projects(name, project_code)), 
            users:requested_by(name)
        `)
        .order('requested_date', { ascending: false });
    if (error) throw error;
    return data.map((d: any) => ({
        id: d.id,
        milestoneId: d.milestone_id,
        requestedBy: d.requested_by,
        requestedDate: d.requested_date,
        oldDueDate: d.old_due_date,
        newDueDate: d.new_due_date,
        reason: d.reason,
        status: d.status,
        approvedBy: d.approved_by,
        approvalDate: d.approval_date,
        rejectionReason: d.rejection_reason,
        requesterName: d.users?.name,
        milestoneTitle: d.activities?.title,
        milestoneAmount: d.activities?.payment_amount,
        projectId: d.activities?.project_id,
        projectName: d.activities?.projects?.name,
        projectCode: d.activities?.projects?.project_code
    }));
};

export const fetchMilestoneAuditLogs = async (milestoneId: string) => {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase.from('milestone_audit_logs').select('*, users(name)').eq('milestone_id', milestoneId).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((d: any) => ({
        id: d.id,
        milestoneId: d.milestone_id,
        userId: d.user_id,
        action: d.action,
        fieldName: d.field_name,
        oldValue: d.old_value,
        newValue: d.new_value,
        createdAt: d.created_at,
        userName: d.users?.name
    }));
};

export const addIssueComment = async (issueId: string, userId: string, content: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase.from('issue_comments').insert([{
        issue_id: issueId,
        user_id: userId,
        content: content
    }]).select();
    if (error) throw error;
    return data[0];
};

export const markNotificationRead = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
};

export const addIssue = async (issueData: Omit<Issue, 'id' | 'createdAt'>) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    
    const insertData = {
        title: issueData.title,
        description: issueData.description || null,
        status: issueData.status,
        priority: issueData.priority,
        project_id: issueData.projectId,
        milestone_id: issueData.milestoneId || null,
        assignee_id: issueData.assigneeId || null,
        reporter_id: issueData.reporterId,
        expected_duration: issueData.expectedDuration || null
    };

    const { data, error } = await supabase.from('issues').insert([insertData]).select();
    if (error) throw error;
    
    if (insertData.assignee_id) {
        await supabase.from('notifications').insert([{
            user_id: insertData.assignee_id,
            title: 'New Issue Assigned',
            message: `You have been assigned to: ${insertData.title}`,
            type: 'issue_assigned',
            link_id: data[0].id
        }]);
    }
    return data[0];
};

export const updateIssue = async (id: string, issueData: Partial<Issue>) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const updateData: any = {};
    if (issueData.status) updateData.status = issueData.status;
    if (issueData.priority) updateData.priority = issueData.priority;
    if (issueData.assigneeId !== undefined) updateData.assignee_id = issueData.assigneeId || null;
    const { data, error } = await supabase.from('issues').update(updateData).eq('id', id).select();
    if (error) throw error;
    return data[0];
};

export const addProject = async (p: any) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");

    const generatedCode = 'PIO-' + Math.floor(1000 + Math.random() * 9000);

    const { data, error } = await supabase.from('projects').insert([{
        name: p.name,
        description: p.description,
        project_code: generatedCode,
        country_id: p.countryId || null,
        category_id: p.categoryId || null,
        team_id: p.teamId || null,
        product_id: p.productId || null,
        status_id: p.statusId || null,
        project_manager_id: p.projectManagerId || null,
        customer_id: p.customerId || null,
        launch_date: p.launchDate || null,
        actual_start_date: p.actualStartDate || null,
        expected_closure_date: p.expectedClosureDate || null,
        progress: p.progress,
        revenue_impact: p.revenueImpact,
        strategic_value: p.strategicValue,
        delivery_risk: p.deliveryRisk,
        customer_pressure: p.customerPressure,
        resource_load: p.resourceLoad
    }]).select().single();
    if (error) throw error;
    return data;
};

export const updateProject = async (id: string, p: any) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { error } = await supabase.from('projects').update({
        name: p.name, 
        description: p.description, 
        country_id: p.countryId || null, 
        category_id: p.categoryId || null, 
        team_id: p.teamId || null, 
        product_id: p.productId || null, 
        status_id: p.statusId || null, 
        project_manager_id: p.projectManagerId || null, 
        customer_id: p.customerId || null, 
        launch_date: p.launchDate || null, 
        actual_start_date: p.actualStartDate || null, 
        expected_closure_date: p.expectedClosureDate || null, 
        progress: p.progress, 
        revenue_impact: p.revenueImpact, 
        strategic_value: p.strategicValue, 
        delivery_risk: p.deliveryRisk, 
        customer_pressure: p.customerPressure, 
        resource_load: p.resourceLoad
    }).eq('id', id);
    if (error) throw error;
};

export const deleteProject = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
};

export const addMilestones = async (ms: any[]) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    
    // Fix: Map the camelCase frontend properties to snake_case backend columns
    const { error } = await supabase.from('activities').insert(ms.map(m => ({
        title: m.title, 
        description: m.description, 
        project_id: m.projectId, 
        team_id: m.teamId, 
        due_date: m.dueDate, 
        status: m.status, 
        has_payment: m.hasPayment, // FIXED from m.has_payment
        payment_amount: m.paymentAmount, // FIXED from m.payment_amount
        payment_status: m.paymentStatus // FIXED from m.payment_status
    })));
    if (error) throw error;
};

export const updateMilestone = async (id: string, m: any) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const updateData: any = {};
    if (m.title !== undefined) updateData.title = m.title;
    if (m.status !== undefined) updateData.status = m.status;
    if (m.paymentStatus !== undefined) updateData.payment_status = m.paymentStatus;
    if (m.paymentAmount !== undefined) updateData.payment_amount = m.paymentAmount;
    if (m.dueDate !== undefined) updateData.due_date = m.dueDate;
    if (m.teamId !== undefined) updateData.team_id = m.teamId;
    const { error } = await supabase.from('activities').update(updateData).eq('id', id);
    if (error) throw error;
};

export const addMaintenanceContract = async (c: any) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { error } = await supabase.from('maintenance_contracts').insert([{
        type: c.type, 
        month: c.month, 
        year: c.year, 
        customer_id: c.customerId, 
        project_code: c.projectCode, 
        total_amount: c.totalAmount, 
        collected_amount: c.collectedAmount, 
        lost_amount: c.lostAmount, 
        start_date: c.startDate, 
        end_date: c.endDate, 
        notes: c.notes
    }]);
    if (error) throw error;
};

export const updateMaintenanceContract = async (id: string, c: any) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { error } = await supabase.from('maintenance_contracts').update({
        type: c.type, 
        month: c.month, 
        year: c.year, 
        customer_id: c.customerId, 
        project_code: c.projectCode, 
        total_amount: c.totalAmount, 
        collected_amount: c.collectedAmount, 
        lost_amount: c.lostAmount, 
        start_date: c.startDate, 
        end_date: c.endDate, 
        notes: c.notes
    }).eq('id', id);
    if (error) throw error;
};

export const updateLookups = async (type: keyof Lookups, items: Lookup[]) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const tableMap: Record<string, string> = {
        countries: 'countries', categories: 'categories', teams: 'teams', products: 'products', projectStatuses: 'project_statuses', customers: 'customers'
    };
    const tableName = tableMap[type];
    if (!tableName) throw new Error(`Unknown lookup type: ${type}`);

    // Delete + upsert run inside a single Postgres function body (one transaction),
    // so a failed upsert can't leave the table with rows deleted and nothing restored.
    const { error } = await supabase.rpc('replace_lookup_items', {
        p_table: tableName,
        p_items: items.map(i => ({ id: i.id, name: i.name }))
    });
    if (error) throw error;
};

export const addMilestoneUpdate = async (u: any) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { error } = await supabase.from('milestone_updates').insert([{
        milestone_id: u.milestoneId, user_id: u.userId, update_text: u.updateText
    }]);
    if (error) throw error;
};

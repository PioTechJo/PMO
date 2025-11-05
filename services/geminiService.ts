import { GoogleGenAI, Type } from "@google/genai";
import { Project, Activity, User, Lookup, AnalysisResult } from '../types';

let aiClient: GoogleGenAI | null = null;

const resultSchema = {
    type: Type.OBJECT,
    properties: {
        resultType: { type: Type.STRING, enum: ['PROJECTS', 'ACTIVITIES', 'SUMMARY', 'KPIS', 'ERROR'] },
        projects: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ['id'] },
        },
        activities: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ['id'] },
        },
        summary: { type: Type.STRING },
        kpis: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { title: { type: Type.STRING }, value: { type: Type.STRING } },
                required: ['title', 'value'],
            },
        },
        error: { type: Type.STRING },
    },
    required: ['resultType'],
};

const formatDataForPrompt = (projects: Project[], activities: Activity[], users: User[], teams: Lookup[]): string => {
    const context = {
        projects: projects.map(p => ({ id: p.id, name: p.name, projectCode: p.projectCode, status: p.status?.name, description: p.description, progress: p.progress, manager: p.projectManager?.name, customer: p.customer?.name })),
        activities: activities.map(a => ({ id: a.id, title: a.title, status: a.status, projectId: a.projectId, teamId: a.teamId, dueDate: a.dueDate, paymentStatus: a.paymentStatus, paymentAmount: a.paymentAmount })),
        users: users.map(u => ({ id: u.id, name: u.name })),
        teams: teams.map(t => ({ id: t.id, name: t.name })),
    };
    return `Data Context:\n${JSON.stringify(context, null, 2)}`;
};

const getAiClient = (): GoogleGenAI => {
    if (!aiClient) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable is not set.");
        }
        aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return aiClient;
};

export const analyzeQuery = async (query: string, projects: Project[], activities: Activity[], users: User[], teams: Lookup[]): Promise<AnalysisResult> => {
    try {
        const ai = getAiClient();
        
        const dataContext = formatDataForPrompt(projects, activities, users, teams);
        const prompt = `
            You are an AI assistant for a project management tool. Your task is to analyze a user's natural language query and return a structured JSON response based on the provided data context.
            The current date is ${new Date().toISOString()}.

            Determine the user's intent:
            - **ACTIVITIES**: If the query asks for a list of activities (e.g., "completed activities", "activities for project X").
            - **PROJECTS**: If the query asks for a list of projects (e.g., "active projects", "projects for customer Y").
            - **SUMMARY**: For general questions about a specific entity that requires a text-based answer (e.g., "status of CRM project").
            - **KPIS**: For queries asking for a specific number, calculation, or key metric (e.g., "show me kpis", "what is the total payment for project with code OAB-BNAKBIDWH-07-24?", "how many activities are overdue?").
            - **ERROR**: If the query is unclear or cannot be answered from the context.
            
            For KPI or SUMMARY requests about a specific project or activity, use the provided context to find the relevant information and perform calculations if needed. The user might use the project name or the project code.

            User Query: "${query}"

            ${dataContext}

            When returning 'ACTIVITIES' or 'PROJECTS', provide an array of objects containing only the 'id' of each matching item.
            When returning 'KPIS', provide a title for the metric and its calculated value.
            Respond ONLY with a valid JSON object that matches the required schema.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: resultSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        if (result.activities && !Array.isArray(result.activities)) {
            result.activities = [result.activities];
        }
        if (result.projects && !Array.isArray(result.projects)) {
            result.projects = [result.projects];
        }

        return result as AnalysisResult;

    } catch (error) {
        console.error("Error analyzing query with Gemini API:", error);
        if (error instanceof Error) {
            return { resultType: 'ERROR', error: `AI analysis failed: ${error.message}` };
        }
        return { resultType: 'ERROR', error: "An unknown error occurred during AI analysis." };
    }
};

export const getChatResponse = async (query: string, projects: Project[], activities: Activity[], users: User[], teams: Lookup[]): Promise<string> => {
    try {
        const ai = getAiClient();
        const dataContext = formatDataForPrompt(projects, activities, users, teams);
        const prompt = `
            You are a helpful and friendly AI assistant named "Pio-Bot" integrated into a project management tool.
            Your goal is to answer the user's questions based on the provided data context in a conversational manner.
            Keep your answers concise and to the point. Answer in the same language as the user's query.
            The current date is ${new Date().toISOString()}.

            User Query: "${query}"

            ${dataContext}

            Respond in natural language.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error getting chat response from Gemini API:", error);
        if (error instanceof Error) {
            return `Sorry, I encountered an error: ${error.message}`;
        }
        return "Sorry, I was unable to process your request.";
    }
};
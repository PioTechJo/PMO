
import { GoogleGenAI, Type } from "@google/genai";
import { Project, Milestone, User, Lookup, AnalysisResult } from '../types';

const resultSchema = {
    type: Type.OBJECT,
    properties: {
        resultType: { type: Type.STRING, enum: ['PROJECTS', 'MILESTONES', 'SUMMARY', 'KPIS', 'ERROR'] },
        projects: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ['id'] },
        },
        milestones: {
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

const formatDataForPrompt = (projects: Project[], milestones: Milestone[], users: User[], teams: Lookup[]): string => {
    // تقليص البيانات المرسلة لزيادة السرعة
    const context = {
        p: projects.map(p => ({
            id: p.id,
            n: p.name,
            c: p.projectCode,
            s: p.status?.name,
            cnt: p.country?.name,
            cat: p.category?.name,
            cust: p.customer?.name
        })),
        m: milestones.map(m => ({
            id: m.id,
            t: m.title,
            pid: m.projectId,
            d: m.dueDate,
            ps: m.paymentStatus,
            a: m.paymentAmount
        })),
    };
    return `Context: ${JSON.stringify(context)}`;
};

export const analyzeQuery = async (query: string, projects: Project[], milestones: Milestone[], users: User[], teams: Lookup[]): Promise<AnalysisResult> => {
    try {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable is not set.");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const dataContext = formatDataForPrompt(projects, milestones, users, teams);
        const prompt = `
            Analyze this query for a project tool: "${query}"
            Current Date: ${new Date().toISOString()}.
            
            Return JSON only.
            Intent Rules:
            - PROJECTS: if asking for lists (e.g. "projects in Jordan")
            - MILESTONES: if asking for specific activities
            - KPIS: for counts/sums (e.g. "# of projects", "total value")
            - SUMMARY: for status text.
            
            ${dataContext}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview", // استخدام Flash للسرعة القصوى
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: resultSchema,
                thinkingConfig: { thinkingBudget: 0 }, // إلغاء وقت التفكير لزيادة السرعة
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        if (result.milestones && !Array.isArray(result.milestones)) result.milestones = [result.milestones];
        if (result.projects && !Array.isArray(result.projects)) result.projects = [result.projects];

        return result as AnalysisResult;

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return { resultType: 'ERROR', error: "AI temporary delay or error." };
    }
};

export const getChatResponse = async (query: string, projects: Project[], milestones: Milestone[], users: User[], teams: Lookup[]): Promise<string> => {
    try {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable is not set.");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const dataContext = formatDataForPrompt(projects, milestones, users, teams);
        const prompt = `
            You are "Pio-Bot". Answer concisely based on this data:
            ${dataContext}
            Query: "${query}"
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview", // استخدام Flash للمحادثة السريعة أيضاً
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 }
            }
        });

        return response.text.trim();
    } catch (error) {
        return "Sorry, I'm having trouble responding quickly right now.";
    }
};

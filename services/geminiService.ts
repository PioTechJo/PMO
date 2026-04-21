
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

// API Key is obtained exclusively from process.env.API_KEY as per guidelines.

const formatDataForPrompt = (projects: Project[], milestones: Milestone[]): string => {
    const context = {
        p: projects.map(p => ({
            id: p.id,
            n: p.name,
            s: p.status?.name,
            c: p.customer?.name,
            pm: p.projectManager?.name
        })).slice(0, 50),
        m: milestones.map(m => ({
            id: m.id,
            t: m.title,
            pid: m.projectId,
            d: m.dueDate,
            ps: m.paymentStatus,
            a: m.paymentAmount
        })).slice(0, 100),
    };
    return `Data: ${JSON.stringify(context)}`;
};

export const analyzeQuery = async (query: string, projects: Project[], milestones: Milestone[], users: User[], teams: Lookup[]): Promise<AnalysisResult> => {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        return { 
            resultType: 'ERROR', 
            error: "API Key is not configured in process.env.API_KEY." 
        };
    }

    try {
        // Initialize GoogleGenAI right before making the API call as per guidelines.
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const dataContext = formatDataForPrompt(projects, milestones);
        
        const prompt = `
            You are a project analyst. Analyze: "${query}"
            Rules:
            1. PROJECTS: for lists of project items.
            2. MILESTONES: for specific tasks/milestones.
            3. KPIS: for stats (counts, sums, totals).
            4. SUMMARY: for general status updates.
            
            ${dataContext}
            Answer in JSON only matching the schema.
        `;

        const response = await ai.models.generateContent({
            // Complex analysis tasks use gemini-3-pro-preview.
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: resultSchema,
                thinkingConfig: { thinkingBudget: 0 },
            },
        });

        // Use the .text property directly.
        const resultText = response.text;
        if (!resultText) throw new Error("Empty response from AI.");
        
        const result = JSON.parse(resultText.trim());
        return result as AnalysisResult;

    } catch (error: any) {
        console.error("AI Error:", error);
        return { 
            resultType: 'ERROR', 
            error: "AI service connection error." 
        };
    }
};

export const getChatResponse = async (query: string, projects: Project[], milestones: Milestone[], users: User[], teams: Lookup[]): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "AI Assistant config error.";

    try {
        // Initialize GoogleGenAI right before making the API call.
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const dataContext = formatDataForPrompt(projects, milestones);
        
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `You are 'Pio-Bot'. Answer concisely based on this data: ${dataContext}. Query: "${query}"`,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });

        return response.text?.trim() || "No response received from Assistant.";
    } catch (error) {
        return "Chat assistant encountered an error.";
    }
};

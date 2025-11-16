export type Phase = {
    id: string;
    title: string;
    start?: string; // ISO date
    end?: string; // ISO date
    completed?: boolean;
};

export type StakeholderRef = {
    id: string;
    name: string;
    role?: string;
    type: "customer" | "contractor";
};

export type ProjectStatus =
    | "Planning"
    | "Active"
    | "On Hold"
    | "Completed"
    | "Cancelled";

export type Project = {
    id: string;
    name: string;
    code?: string;
    description?: string;
    category?: string;
    phases: Phase[];
    customers: StakeholderRef[];
    contractors: StakeholderRef[];
    budget?: number;
    priority?: "Low" | "Medium" | "High" | "Critical";
    status?: ProjectStatus;
    tags?: string[];
    files?: { id: string; name: string }[];
    archived?: boolean;
    history?: Array<{ when: string; by: string; changes: string }>;
    createdAt: string;
    updatedAt: string;
};

export interface User {
    id: string;
    name: string;
}
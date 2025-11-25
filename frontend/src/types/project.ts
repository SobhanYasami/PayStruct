// types/project.ts
export type ProjectStatus = 'active' | 'inProgress' | 'completed' | 'onHold';

export interface Project {
	id: string;
	name: string;
	description?: string;
	status: ProjectStatus;
	phase?: string;
	startDate?: string;
	endDate?: string;
	progress: number;
	teamMembers?: string[];
	tags?: string[];
	createdAt: string;
	updatedAt: string;
}
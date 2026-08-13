export const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

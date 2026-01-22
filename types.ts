
export enum Pillar {
  DASHBOARD = 'DASHBOARD',
  KNOWLEDGE = 'KNOWLEDGE',
  ENABLEMENT = 'ENABLEMENT',
  COMPETITIVE = 'COMPETITIVE',
  LEARNING = 'LEARNING',
  ASSETS = 'ASSETS',
  AI_ASSISTANT = 'AI_ASSISTANT',
  ADMIN = 'ADMIN'
}

export interface Product {
  id?: number; // Optional for creation, number for existing
  name: string;
  category: string;
  description: string;
  problemSolved: string;
  itLandscape: string[];
  deploymentModels: string[];
  licensing: string;
  pricingBand: string;
  notToSell: string[];
  capabilities: Capability[];
}

export interface Capability {
  title: string;
  whatItDoes: string;
  whyItMatters: string;
  useCase: string;
}

export interface ICP {
  companySize: string[];
  revenueRange: string;
  industries: string[];
  geography: string[];
  buyingTriggers: string[];
}

export interface Persona {
  role: string;
  name: string;
  kpis: string[];
  fears: string[];
  narrative: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  userType?: string;
  partnerCategory?: string;
  permissions?: string[];
  roleName?: string;
  mustChangePassword?: boolean;
}

export interface Category {
  id: number;
  name: string;
}

export interface PartnerCategory {
  id: number;
  name: string;
}

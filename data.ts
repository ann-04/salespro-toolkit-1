
import { Product, ICP, Persona } from './types';

export const SECLORE_PRODUCT: Product = {
  id: 'seclore-drm',
  name: 'Seclore – Data Rights Management (DRM)',
  category: 'Data Security | Information Protection',
  description: 'Seclore helps organizations control, monitor, and protect sensitive data even after it leaves their network—whether it’s shared with employees, partners, vendors, or regulators.',
  problemSolved: 'Traditional security protects systems and networks, not the data itself. Once sensitive data is shared, organizations lose control. Seclore ensures data remains protected wherever it goes.',
  itLandscape: [
    'Complements DLP, CASB, IAM',
    'Works alongside Microsoft 365, SAP, Salesforce, file shares',
    'Sits at the data layer (last line of defense)'
  ],
  deploymentModels: ['On-Premise', 'Hybrid', 'Private Cloud'],
  licensing: 'Subscription-based (per user / per data volume / per application)',
  pricingBand: '₹₹₹ (Enterprise-grade security solution)',
  notToSell: [
    'Small organizations with minimal data sharing',
    'Companies looking only for basic email encryption',
    'Environments with no external data sharing'
  ],
  capabilities: [
    {
      title: 'Persistent Data Protection',
      whatItDoes: 'Protects files and data even after they leave the organization.',
      whyItMatters: 'Most data leaks happen after data is shared.',
      useCase: 'Bank shares customer data with an external auditor—data remains encrypted, access-controlled, and monitored.'
    },
    {
      title: 'Fine-Grained Access Control',
      whatItDoes: 'Controls who can view, edit, copy, print, or share data—at user, role, or group level.',
      whyItMatters: 'Prevents insider threats and accidental data leakage.',
      useCase: 'Only compliance team can print regulatory reports; vendors can view but not download.'
    },
    {
      title: 'Dynamic Policy Enforcement',
      whatItDoes: 'Access policies can be changed even after data is shared.',
      whyItMatters: 'Immediate response to risk without recalling data.',
      useCase: 'Employee exits organization—access revoked instantly across all shared files.'
    },
    {
      title: 'Usage Monitoring & Audit Trails',
      whatItDoes: 'Tracks who accessed data, when, from where, and what they did.',
      whyItMatters: 'Critical for compliance, investigations, and audits.',
      useCase: 'SEBI audit requires proof of who accessed sensitive financial data.'
    }
  ]
};

export const SECLORE_ICP: ICP = {
  companySize: ['Mid-market (₹500 Cr+)', 'Enterprise (₹2,000 Cr+)'],
  revenueRange: '₹500 Cr+',
  industries: ['BFSI', 'Pharmaceuticals', 'Manufacturing (IP-heavy)', 'IT Services', 'Government / PSU'],
  geography: ['India', 'APAC', 'Regulated global operations'],
  buyingTriggers: [
    'Regulatory audits (SEBI, RBI, DPDP Act)',
    'Large-scale partner collaboration',
    'IP leakage incidents',
    'M&A activity',
    'Increased outsourcing'
  ]
};

export const PERSONAS: Persona[] = [
  {
    role: 'CFO',
    name: 'Chief Financial Officer',
    kpis: ['Financial risk reduction', 'Penalty avoidance', 'Predictability'],
    fears: ['Regulatory fines', 'Uncontrolled data exposure'],
    narrative: 'Seclore reduces financial risk by ensuring sensitive data is always controlled, auditable, and compliant.'
  },
  {
    role: 'CIO',
    name: 'Chief Information Officer',
    kpis: ['Security posture', 'Seamless integration', 'Scalability'],
    fears: ['Complexity', 'Shadow IT', 'Breach response costs'],
    narrative: 'Seclore integrates seamlessly with your existing stack and closes the last-mile data security gap.'
  }
];

export const OBJECTIONS = [
  {
    query: 'This seems too complex.',
    reason: 'Fear of change.',
    response: 'Seclore works with your existing tools—no rip-and-replace.',
    proof: 'Reference architecture + pilot approach.'
  },
  {
    query: 'We already have DLP.',
    reason: 'Tool overlap misunderstanding.',
    response: 'DLP protects data before it leaves. Seclore protects it after it leaves.',
    proof: 'Case studies of hybrid DLP-DRM implementations.'
  }
];

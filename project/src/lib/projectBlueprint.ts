import { MASTER_PROMPT_RAW } from './masterPrompt';

export interface VibeCodingPrompt {
  phase: number;
  title: string;
  role: string;
  summary: string;
  prompt: string;
  filesToCreateOrModify: string[];
  definitionOfDone: string[];
}

export interface KeyTable {
  name: string;
  description: string;
  columns: string[];
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  description: string;
  auth: boolean;
}

export interface ThreatItem {
  risk: string;
  impact: string;
  mitigation: string;
}

export interface ProjectBlueprint {
  productName: string;
  category: string;
  productType: string;
  description: string;
  problemSolved: string;
  targetUsers: string;
  coreValueProp: string;
  keyFeatures: {
    mustHave: string[];
    shouldHave: string[];
    couldHave: string[];
    notMvp: string[];
  };
  recommendedTechStack: {
    frontend: string;
    backend: string;
    database: string;
    auth: string;
    hosting: string;
    styling: string;
    payments?: string;
  };
  keyDatabaseTables: KeyTable[];
  apiEndpoints: ApiEndpoint[];
  securityThreatModel: ThreatItem[];
  privacyCompliance: {
    dataCollected: string[];
    regulations: string[];
    retention: string;
    cookieRequirements: string;
  };
  vibeCodingPrompts: VibeCodingPrompt[];
  fullMasterPrompt: string;
}

interface ProjectInput {
  id?: string;
  name: string;
  description?: string | null;
  tag?: string;
}

/**
 * Intelligent domain lookup and procedural generation for project blueprints.
 */
export function generateProjectBlueprint(project: ProjectInput): ProjectBlueprint {
  const name = project.name.trim();
  const rawDesc = (project.description || '').trim();
  const tag = (project.tag || 'web-app').toLowerCase();

  // 1. Determine Archetype & Tech Stack
  let productType = 'Full-Stack Web Application';
  let frontend = 'React (Vite) + TypeScript';
  let backend = 'Node.js / Hono or Serverless Functions';
  let database = 'Turso (libSQL/SQLite) or PostgreSQL';
  let auth = 'Magic Links / Session-based Auth';
  let hosting = 'Cloudflare Pages / Vercel';
  let styling = 'Tailwind CSS + Lucide Icons';
  let payments: string | undefined = undefined;

  if (tag === 'app' || name.toLowerCase().includes('app + web') || name.toLowerCase().includes('workout') || name.toLowerCase().includes('journal')) {
    productType = 'Cross-Platform Mobile App (Android/iOS) + Responsive Web';
    frontend = 'React Native (Expo SDK) + React (Vite Web)';
    backend = 'Supabase / Node.js / Hono (Edge)';
    database = 'PostgreSQL / Turso (libSQL with local SQLite sync)';
    auth = 'Supabase Auth / Google OAuth & Apple Sign-In';
    hosting = 'Cloudflare Workers & Vercel / Expo EAS';
    styling = 'Tailwind CSS (NativeWind for Mobile)';
  } else if (tag === 'saas' || name.toLowerCase().includes('platform') || name.toLowerCase().includes('portal') || name.toLowerCase().includes('crm')) {
    productType = 'SaaS (B2B / B2C Subscription Platform)';
    frontend = 'Next.js 14/15 App Router / Vite React SPA';
    backend = 'Server Actions / Node.js REST API with Webhooks';
    database = 'Turso (libSQL) / Supabase PostgreSQL + Drizzle ORM';
    auth = 'Clerk / Supabase Auth (Multi-tenant & Role-based RBAC)';
    hosting = 'Vercel / Railway / Cloudflare Pages';
    styling = 'Tailwind CSS + Radix UI Primitives';
    payments = 'Stripe / Razorpay (Subscription billing, Webhook verification, GST invoice generation)';
  } else if (tag === 'tool' || name.toLowerCase().includes('generator') || name.toLowerCase().includes('checker') || name.toLowerCase().includes('converter') || name.toLowerCase().includes('calculator')) {
    productType = 'High-Performance Utility Tool (Client-First / Edge-Optimized)';
    frontend = 'Vite + React + Web Workers & WebAssembly / Canvas / pdf-lib';
    backend = 'Cloudflare Workers (Edge API with strict rate-limiting)';
    database = 'Local-First (IndexedDB / LocalStorage) with optional Cloud Sync';
    auth = 'Optional / Frictionless Anonymous Mode';
    hosting = 'Cloudflare Pages (Global CDN with zero-egress fees)';
    styling = 'Tailwind CSS (High-contrast utility UI)';
    payments = 'Razorpay / Lemon Squeezy (One-time export passes or micro-subscriptions)';
  } else if (tag === 'games' || name.toLowerCase().includes('game') || name.toLowerCase().includes('trainer') || name.toLowerCase().includes('sprint')) {
    productType = 'Interactive Web Game / Cognitive Trainer';
    frontend = 'React + HTML5 Canvas / Framer Motion';
    backend = 'Lightweight Node.js / WebSocket (PartyKit or Supabase Realtime)';
    database = 'Upstash Redis (Leaderboards) + Turso (User Game History)';
    auth = 'Guest Session + Google One-Tap Auth for Leaderboard';
    hosting = 'Cloudflare Pages / Vercel Edge';
    styling = 'Tailwind CSS (Arcade & Dark Gaming UI)';
  }

  // 2. Domain-Specific Problem, Persona & Value Proposition
  let problemSolved = rawDesc || `Users lack a modern, friction-free tool to accomplish ${name} efficiently without invasive ads or high subscription fees.`;
  let targetUsers = 'Solo founders, freelancers, consumers, and digital professionals seeking streamlined software.';
  let coreValueProp = `Instantly execute ${name} with zero friction, beautiful UI, and transparent privacy.`;
  
  const lowerName = name.toLowerCase();
  let keyTables: KeyTable[] = [];
  let apiEndpoints: ApiEndpoint[] = [];
  let mustHave: string[] = [];
  let shouldHave: string[] = [];
  let couldHave: string[] = [];
  let notMvp: string[] = [];
  let securityThreats: ThreatItem[] = [];

  if (lowerName.includes('resume')) {
    problemSolved = 'Job applicants get rejected by Applicant Tracking Systems (ATS) due to mismatched keywords, confusing formatting, and lack of role-specific phrasing.';
    targetUsers = 'Active job seekers, career switchers, and recent college graduates applying to modern tech and corporate roles.';
    coreValueProp = 'Instant ATS match score and section-by-section rewrite suggestions tailored to specific job descriptions without leaking resume data.';
    keyTables = [
      { name: 'resumes', description: 'Stores user resumes with parsed markdown/text', columns: ['id', 'user_id', 'title', 'parsed_content', 'created_at'] },
      { name: 'job_descriptions', description: 'Target job postings analyzed against resume', columns: ['id', 'user_id', 'company_name', 'role_title', 'raw_text', 'skills_extracted'] },
      { name: 'match_reports', description: 'ATS score, keyword gaps, and tailored rewrite diffs', columns: ['id', 'resume_id', 'job_id', 'match_score', 'missing_keywords', 'rewrite_diff'] },
    ];
    apiEndpoints = [
      { method: 'POST', endpoint: '/api/resumes/parse', description: 'Parse PDF/DOCX resume into structured text', auth: true },
      { method: 'POST', endpoint: '/api/matches/analyze', description: 'Run semantic matching against job description and return score', auth: true },
      { method: 'POST', endpoint: '/api/matches/rewrite', description: 'Generate targeted bullet point improvements', auth: true },
    ];
    mustHave = ['PDF/DOCX resume file parser', 'Job description text input', 'Match score algorithm (0-100%)', 'Missing keywords checklist'];
    shouldHave = ['1-click copy for improved bullet points', 'Keyword density analyzer', 'Export tailored resume as clean PDF'];
    couldHave = ['LinkedIn job posting URL scraper', 'Multiple resume version comparisons'];
    notMvp = ['Automatic job application bot', 'Full mock interview simulator'];
    securityThreats = [
      { risk: 'Malicious PDF Upload (Embedded scripts/exploits)', impact: 'Server-side execution or client XSS', mitigation: 'Extract plain text on client or isolated sandboxed parser; reject binary executables.' },
      { risk: 'PII Exposure (Phone, email, home address in resumes)', impact: 'Data privacy breach', mitigation: 'Encrypt resume content at rest; provide instant "Purge My Resume" button.' },
    ];
  } else if (lowerName.includes('trust checker') || lowerName.includes('domain')) {
    problemSolved = 'Online shoppers and internet users fall victim to fraudulent e-commerce storefronts, phishing sites, and newly registered scam domains.';
    targetUsers = 'Everyday consumers buying from social media ads, fraud researchers, and cautious internet shoppers.';
    coreValueProp = 'Real-time safety verdict combining WHOIS registration age, SSL certificate validity, DNS records, and scam databases in 1.5 seconds.';
    keyTables = [
      { name: 'domain_checks', description: 'Cached audit results for queried domains', columns: ['id', 'domain_name', 'domain_age_days', 'ssl_valid', 'registrar', 'trust_score', 'checked_at'] },
      { name: 'scam_reports', description: 'Community flags and reported fraudulent stores', columns: ['id', 'domain_name', 'report_reason', 'reporter_ip_hash', 'verified', 'created_at'] },
    ];
    apiEndpoints = [
      { method: 'GET', endpoint: '/api/domain/check?url=:url', description: 'Perform WHOIS + SSL certificate + reputation audit', auth: false },
      { method: 'POST', endpoint: '/api/domain/report', description: 'Submit scam report with evidence URL', auth: false },
    ];
    mustHave = ['Domain URL input & sanitization', 'WHOIS creation date extraction', 'SSL certificate validity check', 'Trust Score (Safe / Caution / Suspicious)'];
    shouldHave = ['Recent scam report indicators', 'Redirect chain follower to catch cloaked affiliate links', 'Shareable audit badge'];
    couldHave = ['Browser extension for real-time shopping protection', 'DNSSEC & blacklist checks'];
    notMvp = ['Automated bank transaction chargeback filing', 'Merchant payment processor inspection'];
    securityThreats = [
      { risk: 'SSRF Attack via arbitrary URL input', impact: 'Attacker queries internal servers (e.g., 169.254.169.254 or localhost)', mitigation: 'Strict URL validation; resolve DNS and block loopback, RFC1918 private IPs, and metadata endpoints.' },
      { risk: 'WHOIS Rate Limiting / IP Blacklist', impact: 'Service disruption', mitigation: 'Implement Redis caching with 24-hour TTL for domain check results.' },
    ];
  } else if (lowerName.includes('complaint drafter') || lowerName.includes('consumer')) {
    problemSolved = 'Consumers facing deficient service, counterfeit goods, or denied refunds struggle to draft formal legal notices conforming to Consumer Protection Act guidelines.';
    targetUsers = 'Aggrieved buyers, online shoppers, tenants, and small businesses seeking formal recourse.';
    coreValueProp = 'Transform everyday dispute details into a legally formatted Consumer Forum / National Consumer Helpline draft in under 3 minutes.';
    keyTables = [
      { name: 'complaints', description: 'User drafted complaints and dispute details', columns: ['id', 'user_id', 'merchant_name', 'transaction_date', 'dispute_amount', 'legal_grounds', 'draft_content', 'status'] },
      { name: 'evidence_files', description: 'Uploaded invoice photos, chat screenshots', columns: ['id', 'complaint_id', 'file_name', 'file_url', 'created_at'] },
    ];
    apiEndpoints = [
      { method: 'POST', endpoint: '/api/complaints/draft', description: 'Generate formatted legal notice and complaint letter', auth: true },
      { method: 'GET', endpoint: '/api/complaints/:id/pdf', description: 'Download complaint ready for NCH or District Commission', auth: true },
    ];
    mustHave = ['Step-by-step guided questionnaire (seller name, order id, amount, issue)', 'Legal section citations (e.g. Consumer Protection Act 2019)', 'Formatted complaint draft preview', 'PDF Download'];
    shouldHave = ['Evidence checklist (bills, tracking IDs, chats)', 'Direct email template for seller legal team', 'National Consumer Helpline (NCH) submission guide'];
    couldHave = ['Automatic legal notice dispatch via speed post API', 'Dispute timeline generator'];
    notMvp = ['Full lawyer marketplace or live court appearance booking'];
    securityThreats = [
      { risk: 'Unlicensed Legal Advice Liability', impact: 'Regulatory violation or user legal reliance', mitigation: 'Prominent statutory disclaimer: "This is a drafting assistant, not formal legal advice. Consult an advocate for legal representation."' },
      { risk: 'Sensitive Financial PII in Invoices', impact: 'Data leakage', mitigation: 'Store drafts encrypted; provide automatic PII redaction for card numbers.' },
    ];
  } else if (lowerName.includes('gst')) {
    problemSolved = 'Businesses and freelancers risk losing Input Tax Credit (ITC) or facing penalties due to dealing with canceled, suspended, or fake GSTINs.';
    targetUsers = 'Accountants, MSME business owners, procurement managers, and freelance professionals.';
    coreValueProp = 'Verify any GSTIN in real-time, validate 15-character checksum, and view return filing compliance history before making vendor payments.';
    keyTables = [
      { name: 'gst_searches', description: 'History of GSTIN verifications and compliance statuses', columns: ['id', 'user_id', 'gstin', 'trade_name', 'legal_name', 'status', 'filing_status', 'created_at'] },
      { name: 'vendor_watchlists', description: 'Monitored vendors with alerts for status changes', columns: ['id', 'user_id', 'gstin', 'notify_email', 'last_checked'] },
    ];
    apiEndpoints = [
      { method: 'GET', endpoint: '/api/gst/verify?gstin=:gstin', description: 'Verify GSTIN format and query portal status', auth: false },
      { method: 'GET', endpoint: '/api/gst/filing-history?gstin=:gstin', description: 'Check GSTR-1 and GSTR-3B filing regularity', auth: true },
    ];
    mustHave = ['Instant 15-character regex & MOD-36 checksum validation', 'Business legal name & trade name lookup', 'Registration active/canceled status', 'State jurisdiction badge'];
    shouldHave = ['Recent return filing compliance check (GSTR-1, 3B)', 'Bulk CSV GSTIN verifier', 'Downloadable vendor verification certificate'];
    couldHave = ['WhatsApp alert when vendor status gets suspended', 'E-way bill format validator'];
    notMvp = ['Direct tax return filing into GSTN portal', 'Tally ERP bidirectional sync'];
    securityThreats = [
      { risk: 'GSTN API Quota Exhaustion / Scraping Block', impact: 'Verification downtime', mitigation: 'Client-side checksum verification first; cache public GSTIN data for 7 days.' },
      { risk: 'Business Financial Surveillance Concerns', impact: 'Privacy violations under DPDP Act', mitigation: 'Do not log search histories of anonymous users; allow users to delete verification logs.' },
    ];
  } else {
    // Default Fallback
    keyTables = [
      { name: `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_records`, description: `Core entity records for ${name}`, columns: ['id', 'user_id', 'title', 'data', 'status', 'created_at', 'updated_at'] },
      { name: 'user_preferences', description: 'User settings, layout, and notification flags', columns: ['user_id', 'settings_json', 'updated_at'] },
      { name: 'audit_logs', description: 'Security and change audit trail', columns: ['id', 'user_id', 'action', 'ip_hash', 'created_at'] },
    ];
    apiEndpoints = [
      { method: 'GET', endpoint: `/api/${tag}/items`, description: `Fetch records for ${name}`, auth: true },
      { method: 'POST', endpoint: `/api/${tag}/items`, description: `Create record for ${name}`, auth: true },
      { method: 'DELETE', endpoint: `/api/${tag}/items/:id`, description: `Delete record and associated data`, auth: true },
    ];
    mustHave = ['Core action workflow & primary input screen', 'Result computation / processing display', 'History or saved items view', 'Export / share capability'];
    shouldHave = ['Offline support & local caching', 'Keyboard shortcuts for power users', 'Search & filter capabilities'];
    couldHave = ['Multi-user collaboration', 'Dark/light theme customizer'];
    notMvp = ['Enterprise single-sign-on (SAML/Okta)', 'Legacy system migration tools'];
    securityThreats = [
      { risk: 'Injection & XSS Attacks', impact: 'Compromised client sessions or database corruption', mitigation: 'Sanitize all user inputs using DOMPurify and parameterized SQL queries via ORM.' },
      { risk: 'Broken Object Level Authorization (BOLA/IDOR)', impact: 'Unauthorized access to other users\' records', mitigation: 'Enforce tenant/user ownership checks on every database query and API handler.' },
    ];
  }

  // 3. Security, Privacy & DPDP Compliance
  const privacyCompliance = {
    dataCollected: ['Email / Account ID', 'User-submitted inputs & processed artifacts', 'Basic access telemetry (anonymized IP hash)'],
    regulations: ['India Digital Personal Data Protection Act (DPDP) 2023', 'GDPR (EU) & UK GDPR where applicable', 'CCPA/CPRA (California)'],
    retention: 'Active account duration; automatic hard-deletion within 30 days upon user account deletion request.',
    cookieRequirements: 'Essential session cookies only. Opt-in consent banner for optional performance telemetry; zero third-party advertising tracking cookies in MVP.',
  };

  // 4. Sequential Vibe-Coding Prompts for AI Coding Agents
  const vibeCodingPrompts: VibeCodingPrompt[] = [
    {
      phase: 1,
      title: 'Project Architecture & Foundation Setup',
      role: 'Senior Software Architect & Full-Stack Engineer',
      summary: `Set up the base project repository, TypeScript interfaces, Tailwind styling, and responsive layout for ${name}.`,
      filesToCreateOrModify: [
        'package.json',
        'tsconfig.json',
        'src/types/index.ts',
        'src/App.tsx',
        'src/components/Header.tsx',
        'src/components/Layout.tsx'
      ],
      definitionOfDone: [
        'Vite/React TypeScript template runs with zero errors',
        'Tailwind CSS is configured with clean dark/slate color scheme',
        'Domain models and types are clearly declared in `src/types/index.ts`',
        'Responsive shell layout with Header, Main Content, and Footer renders properly on mobile and desktop'
      ],
      prompt: `Act as my Senior Software Architect. We are building the real-world product: "${name}" (${productType}).
Product Description: ${problemSolved}

Phase 1 Goal: Initialize the project architecture, types, and base UI framework.

Requirements:
1. Ensure the project uses ${frontend} with strict TypeScript and Tailwind CSS.
2. Define domain data models in \`src/types/index.ts\` representing:
   - Primary entity types: ${keyTables.map(t => t.name).join(', ')}
   - User input states, error responses, and status enums.
3. Build a clean, modern layout in \`src/components/Layout.tsx\` with:
   - Navigation header displaying "${name}", current status badge, and theme indicator.
   - Main content viewport with maximum readability (responsive max-w-5xl).
   - Minimalist footer with Privacy & Terms links.
4. Provide zero-dependency, clean code with proper JSDoc comments.
5. Verify build compiles cleanly with \`npm run build\`.`
    },
    {
      phase: 2,
      title: 'Database Schema & Storage Architecture',
      role: 'Database Architect & Senior Backend Engineer',
      summary: `Implement the database schema, data models, Zod validation schemas, and database client for ${name}.`,
      filesToCreateOrModify: [
        'src/lib/db.ts',
        'src/lib/schema.sql',
        'src/lib/validation.ts',
        'src/lib/storage.ts'
      ],
      definitionOfDone: [
        'SQL schema created with primary keys, indexes, foreign keys, and timestamps',
        'Data minimization strictly followed: no unnecessary PII is stored',
        'Zod schemas validate all inputs before writing to database or local storage',
        'Database client functions (CRUD) are strongly typed and handle connection failures gracefully'
      ],
      prompt: `Act as my Database Architect. We are continuing development of "${name}".
Target Database: ${database}
Follow the principle: COLLECT THE MINIMUM DATA NECESSARY.

Phase 2 Goal: Implement the complete database schema and storage client layer.

Requirements:
1. Create \`src/lib/schema.sql\` with full DDL for the following tables:
${keyTables.map(t => `   - **${t.name}**: ${t.description} (Columns: ${t.columns.join(', ')})`).join('\n')}
   Include:
   - UUID primary keys (\`id\`)
   - Indexed foreign keys and search columns
   - Created_at and updated_at ISO timestamps
   - Soft-delete column (\`deleted_at\`) where appropriate
2. Implement Zod validation schemas in \`src/lib/validation.ts\` for all user inputs.
3. Implement strongly typed CRUD helper functions in \`src/lib/db.ts\` (or \`src/lib/storage.ts\` for local-first/Turso).
4. Include mock/offline seed data so the application is immediately testable without a live backend connection.`
    },
    {
      phase: 3,
      title: 'Core MVP Business Logic & Workflows',
      role: 'Senior Full-Stack Engineer',
      summary: `Implement the primary feature workflow, core algorithms, and state management for ${name}.`,
      filesToCreateOrModify: [
        'src/components/MainWorkflow.tsx',
        'src/lib/coreLogic.ts',
        'src/hooks/useCoreAction.ts'
      ],
      definitionOfDone: [
        'User can complete the primary happy path end-to-end',
        'All calculation, parsing, or transformation logic is unit-testable',
        'Empty states, loading spinners, and error callouts are handled explicitly',
        'Inputs are validated and sanitized before processing'
      ],
      prompt: `Act as my Senior Full-Stack Engineer. Build the core MVP feature for "${name}".

Core Value Proposition: ${coreValueProp}
Must-Have Features:
${mustHave.map(f => `- ${f}`).join('\n')}

Phase 3 Goal: Implement the core business logic and primary user experience.

Requirements:
1. Create \`src/lib/coreLogic.ts\` containing the core transformation, calculation, or validation algorithm.
2. Build the primary interactive component \`src/components/MainWorkflow.tsx\`:
   - Step 1: Input collection with inline validation and real-time formatting.
   - Step 2: Processing state with animated progress / skeleton indicator.
   - Step 3: Result presentation with clear visual hierarchy, key metrics, and actionable outputs.
3. Handle edge cases: empty input, extremely long text, special characters, network disconnection.
4. Ensure all user flows are accessible via keyboard and screen readers.`
    },
    {
      phase: 4,
      title: 'UX/UI System Polish & Screen Inventory',
      role: 'Senior UX/UI Strategist & Frontend Developer',
      summary: `Build polished UI components, empty states, loading indicators, toast notifications, and dark mode support.`,
      filesToCreateOrModify: [
        'src/components/ui/Button.tsx',
        'src/components/ui/Card.tsx',
        'src/components/ui/Modal.tsx',
        'src/components/ui/Toast.tsx',
        'src/components/EmptyState.tsx'
      ],
      definitionOfDone: [
        'Components are responsive across mobile (< 640px), tablet (768px), and desktop (1024px+)',
        'Dark mode and high contrast text meet WCAG AA accessibility standards',
        'Empty states provide clear action prompts for first-time users',
        'Toast notification system displays success, error, and info alerts'
      ],
      prompt: `Act as my UX/UI Strategist. Polish the user interface and user flows for "${name}".

Phase 4 Goal: Complete the screen inventory, micro-interactions, and accessible UI system.

Requirements:
1. Implement reusable components in \`src/components/ui/\`:
   - \`Button.tsx\`: Primary, secondary, outline, destructive states with loading spinners.
   - \`Card.tsx\`: Elevated slate card with subtle border and hover transitions.
   - \`Modal.tsx\`: Accessible dialog with focus trap, Esc key listener, and backdrop blur.
   - \`Toast.tsx\`: Toast notification context for feedback alerts.
2. Build dedicated screens:
   - Empty State: Guides first-time users on how to get started.
   - Loading State: Skeleton loaders preventing layout shift.
   - Error Screen: Helpful recovery actions when things go wrong.
3. Ensure UI meets WCAG AA contrast compliance and full mobile responsiveness.`
    },
    {
      phase: 5,
      title: 'Security Hardening, Privacy & Legal Compliance',
      role: 'Security Engineer & Privacy Researcher',
      summary: `Implement input sanitization, rate limiting, secure headers, DPDP India / GDPR compliance notices, and legal modals.`,
      filesToCreateOrModify: [
        'src/lib/sanitize.ts',
        'src/lib/security.ts',
        'src/components/CookieBanner.tsx',
        'src/components/PrivacyModal.tsx',
        'src/components/TermsModal.tsx'
      ],
      definitionOfDone: [
        'All user text is sanitized to prevent XSS (DOMPurify or equivalent)',
        'Threat mitigations implemented for top domain risks',
        'DPDP 2023 / GDPR compliant Privacy Policy and Terms of Service modals added',
        'Zero tracking without user consent; cookie banner with reject-all option'
      ],
      prompt: `Act as my Security & Privacy Engineer. We must harden "${name}" prior to production launch.

Threat Model & Mitigations to Implement:
${securityThreats.map(t => `- **${t.risk}** (Impact: ${t.impact}): ${t.mitigation}`).join('\n')}

Phase 5 Goal: Security hardening, DPDP/GDPR compliance, and legal safeguards.

Requirements:
1. Implement input sanitization in \`src/lib/sanitize.ts\` to neutralize XSS, script injection, and unsafe HTML.
2. Implement client/API rate limiting in \`src/lib/security.ts\` to prevent abuse.
3. Build \`src/components/PrivacyModal.tsx\` detailing:
   - What data is collected: ${privacyCompliance.dataCollected.join(', ')}
   - Data retention policy: ${privacyCompliance.retention}
   - Right to access, correct, and delete data under India DPDP Act 2023 & GDPR.
4. Build \`src/components/TermsModal.tsx\` with acceptable use policy and statutory liability disclaimers.
5. Build \`src/components/CookieBanner.tsx\` ensuring zero non-essential cookies load without explicit opt-in.`
    },
    {
      phase: 6,
      title: 'QA Testing, Production CI/CD & Launch Checklist',
      role: 'QA/Test Engineer & DevOps/Cloud Architect',
      summary: `Set up automated tests, GitHub Actions CI/CD, environment configs, SEO meta tags, and production deployment.`,
      filesToCreateOrModify: [
        'src/test/coreLogic.test.ts',
        '.github/workflows/ci.yml',
        '.env.example',
        'public/robots.txt',
        'public/sitemap.xml',
        'index.html'
      ],
      definitionOfDone: [
        'Unit tests cover core logic, calculation edge cases, and validation rules',
        'CI workflow executes lint, typecheck, and tests on push',
        'SEO metadata (title, Open Graph, meta description, favicon) configured',
        'Production build succeeds and generates lightweight, minified assets'
      ],
      prompt: `Act as my DevOps & QA Engineer. Prepare "${name}" for production launch.

Phase 6 Goal: Automated testing suite, continuous deployment, and pre-flight launch verification.

Requirements:
1. Write unit tests in \`src/test/coreLogic.test.ts\` using Vitest/Jest covering:
   - Happy path workflows
   - Edge cases (empty strings, oversized payloads, malformed inputs)
   - Validation schema error assertions.
2. Create \`.github/workflows/ci.yml\` to run \`npm run lint\`, \`npm run typecheck\`, and \`npm test\` on every PR.
3. Create \`.env.example\` documenting all required environment variables with non-secret dummy values.
4. Add SEO & Social Metadata to \`index.html\`:
   - Title: "${name} — ${coreValueProp.slice(0, 60)}"
   - Meta Description, Open Graph tags, Twitter Card tags.
   - \`robots.txt\` and \`sitemap.xml\` in public directory.
5. Provide the final pre-flight checklist verification before pushing to production.`
    }
  ];

  // 5. Generate Full Master Prompt with all 27 sections filled out
  const fullMasterPrompt = MASTER_PROMPT_RAW
    .replace('[ANDROID APP / IOS APP / WEB APP / SAAS /\nFULL-STACK PRODUCT]', productType.toUpperCase())
    .replace('[ANDROID APP / IOS APP / WEB APP / SAAS / FULL-STACK PRODUCT]', productType.toUpperCase())
    .replace('[PASTE MY PRODUCT IDEA HERE]', 
`Project Name: ${name}
Category: ${tag.toUpperCase()}
Product Type: ${productType}
Description: ${problemSolved}

Problem It Solves:
${problemSolved}

Target Users:
${targetUsers}

Core Value Proposition:
${coreValueProp}

Recommended Tech Stack:
- Frontend: ${frontend}
- Backend: ${backend}
- Database: ${database}
- Auth: ${auth}
- Hosting: ${hosting}
- Styling: ${styling}
${payments ? `- Payments: ${payments}` : ''}

Key Database Entities:
${keyTables.map(t => `- ${t.name}: ${t.description} (${t.columns.slice(0, 4).join(', ')})`).join('\n')}

Security & Privacy Considerations:
- Threats: ${securityThreats.map(t => t.risk).join('; ')}
- Compliance: ${privacyCompliance.regulations.join(', ')}
- Data Retention: ${privacyCompliance.retention}
`);

  return {
    productName: name,
    category: tag,
    productType,
    description: problemSolved,
    problemSolved,
    targetUsers,
    coreValueProp,
    keyFeatures: {
      mustHave,
      shouldHave,
      couldHave,
      notMvp
    },
    recommendedTechStack: {
      frontend,
      backend,
      database,
      auth,
      hosting,
      styling,
      payments
    },
    keyDatabaseTables: keyTables,
    apiEndpoints,
    securityThreatModel: securityThreats,
    privacyCompliance,
    vibeCodingPrompts,
    fullMasterPrompt
  };
}

/**
 * Triggers a client-side download of the complete blueprint as a formatted Markdown (.md) file.
 */
export function downloadBlueprintMarkdown(blueprint: ProjectBlueprint): void {
  const content = `# Project Blueprint: ${blueprint.productName}
**Category:** ${blueprint.category.toUpperCase()} | **Type:** ${blueprint.productType}
*Generated by ProductHub Master Prompt & Build Blueprint System*

---

## 1. Executive Summary & Product Strategy
- **Problem Solved:** ${blueprint.problemSolved}
- **Target Audience:** ${blueprint.targetUsers}
- **Core Value Proposition:** ${blueprint.coreValueProp}

### Feature Priorities (MoSCoW)
**Must-Have (MVP):**
${blueprint.keyFeatures.mustHave.map(f => `- ${f}`).join('\n')}

**Should-Have:**
${blueprint.keyFeatures.shouldHave.map(f => `- ${f}`).join('\n')}

**Could-Have:**
${blueprint.keyFeatures.couldHave.map(f => `- ${f}`).join('\n')}

**Not Required for MVP:**
${blueprint.keyFeatures.notMvp.map(f => `- ${f}`).join('\n')}

---

## 2. Technical Architecture & Recommended Stack
| Layer | Recommendation |
| :--- | :--- |
| **Frontend** | ${blueprint.recommendedTechStack.frontend} |
| **Backend** | ${blueprint.recommendedTechStack.backend} |
| **Database** | ${blueprint.recommendedTechStack.database} |
| **Auth** | ${blueprint.recommendedTechStack.auth} |
| **Hosting & CDN** | ${blueprint.recommendedTechStack.hosting} |
| **Styling** | ${blueprint.recommendedTechStack.styling} |
${blueprint.recommendedTechStack.payments ? `| **Payments** | ${blueprint.recommendedTechStack.payments} |\n` : ''}

---

## 3. Database Schema Design (Minimum Data Necessary)
${blueprint.keyDatabaseTables.map(t => `### Table: \`${t.name}\`
*${t.description}*
Columns:
${t.columns.map(c => `- \`${c}\``).join('\n')}
`).join('\n')}

---

## 4. API Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
${blueprint.apiEndpoints.map(e => `| **${e.method}** | \`${e.endpoint}\` | ${e.description} | ${e.auth ? 'Yes (JWT/Session)' : 'Public / Rate-limited'} |`).join('\n')}

---

## 5. Security & Threat Model
${blueprint.securityThreatModel.map(t => `### Risk: ${t.risk}
- **Impact:** ${t.impact}
- **Mitigation:** ${t.mitigation}
`).join('\n')}

---

## 6. Privacy & Legal Compliance
- **Applicable Frameworks:** ${blueprint.privacyCompliance.regulations.join(', ')}
- **Data Inventory:** ${blueprint.privacyCompliance.dataCollected.join(', ')}
- **Data Retention & Deletion:** ${blueprint.privacyCompliance.retention}
- **Cookies & Tracking:** ${blueprint.privacyCompliance.cookieRequirements}

---

## 7. Phased Vibe-Coding Implementation Prompts for AI Agents
Use these prompts sequentially with Claude, Cursor, Antigravity, Bolt, or ChatGPT:

${blueprint.vibeCodingPrompts.map(p => `### Phase ${p.phase}: ${p.title}
**Role:** ${p.role}  
**Files:** \`${p.filesToCreateOrModify.join('`, `')}\`  
**Definition of Done:**
${p.definitionOfDone.map(d => `- ${d}`).join('\n')}

\`\`\`markdown
${p.prompt}
\`\`\`
`).join('\n---\n')}

---

## 8. Complete 27-Phase Master Launch Document
\`\`\`text
${blueprint.fullMasterPrompt}
\`\`\`
`;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeFilename = blueprint.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  anchor.href = url;
  anchor.download = `${safeFilename}-build-guide.md`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

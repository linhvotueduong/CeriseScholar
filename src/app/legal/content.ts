import type { LegalDocumentKey } from "@/types/legal";
import { REQUIRED_LEGAL_DOCUMENTS } from "@/lib/legal/consent";

export const LEGAL_CONTACT_EMAIL = "cerisescholar@gmail.com";
export const LEGAL_EFFECTIVE_DATE = "May 3, 2026";

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocument {
  key: LegalDocumentKey;
  href: string;
  title: string;
  shortTitle: string;
  summary: string;
  version: string;
  contentHash: string;
  effectiveDate: string;
  sections: LegalSection[];
}

export interface TrustPageContent {
  href: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
}

const requiredBySlug = Object.fromEntries(
  REQUIRED_LEGAL_DOCUMENTS.map((document) => [document.slug, document]),
) as Record<LegalDocumentKey, (typeof REQUIRED_LEGAL_DOCUMENTS)[number]>;

export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    key: "terms",
    href: "/terms",
    title: "Terms of Service",
    shortTitle: "Terms",
    summary:
      "Plain-language terms for using Cerise Scholar during limited public beta, including waitlist access, beta benefits, monthly passes or credits, uploaded research materials, AI support, academic responsibility, and acceptable use.",
    version: requiredBySlug.terms.version,
    contentHash: requiredBySlug.terms.content_hash,
    effectiveDate: "May 4, 2026",
    sections: [
      {
        heading: "Limited beta service",
        body: [
          "Cerise Scholar is a research workspace being prepared for limited public beta. Features may be incomplete, experimental, delayed, unavailable, or changed as the product develops.",
          "Access may be limited by eligibility, capacity, quotas, security review, maintenance, or abuse-prevention needs.",
        ],
      },
      {
        heading: "Beta benefits, monthly passes, and future access",
        body: [
          "Approved beta users may receive benefits such as early access to Cerise Scholar features, research workspace tools, AI-supported workflows, monthly beta passes or credits, and other capacity-based access while the service grows.",
          "Monthly passes, credits, quotas, model access, upload capacity, file-processing capacity, and feature availability may vary by cohort, infrastructure capacity, product stage, provider limits, and abuse-prevention needs.",
          "Cerise Scholar's goal is to move toward unlimited or much broader use in the near future as the product, infrastructure, reliability, and cost controls scale up. During beta, that goal is not a guarantee of unlimited access, unchanged benefits, or permanent availability.",
        ],
      },
      {
        heading: "Accounts and responsibilities",
        body: [
          "During waitlist signup, users are asked to review the Terms of Service and Privacy Policy through an agreement step with unchecked choices. Additional AI Data Use and Beta Participation notices remain available for public review and may be confirmed before protected workspace access.",
          "If you do not agree, do not create an account or use the authenticated workspace.",
          "You are responsible for keeping your account credentials, email account, browser, and devices secure.",
          "Use your own account only. Do not share access, attempt to bypass authentication, or interfere with other users, systems, or data.",
        ],
      },
      {
        heading: "Uploaded files and research materials",
        body: [
          "You keep ownership of the PDFs, notes, highlights, prompts, project data, uploaded files, and academic work you add to Cerise Scholar.",
          "You give Cerise Scholar permission to process those materials only as needed to provide the research workspace, AI features, support, security, abuse prevention, maintenance, and improvement of the service.",
          "Do not upload illegal materials, files you do not have rights to process, malware, scraped datasets that violate terms or law, or content that infringes another person's rights.",
        ],
      },
      {
        heading: "AI assistance and professional advice",
        body: [
          "AI features are informational research support. They are not legal, medical, financial, mental-health, or other professional advice.",
          "AI outputs can be incomplete, outdated, inaccurate, or unsupported by sources. You are responsible for reviewing output before relying on it.",
        ],
      },
      {
        heading: "Academic integrity",
        body: [
          "Cerise Scholar can help organize research, explain material, summarize sources, and draft support content, but you are responsible for final submissions.",
          "Follow your school, publisher, employer, funder, and course rules for citation, authorship, collaboration, disclosure, and AI-assisted work.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not abuse the service, scrape or attack it, probe for vulnerabilities without permission, bypass limits, use another person's account, or use Cerise Scholar for illegal or rights-violating activity.",
          "Cerise Scholar may pause or restrict access when needed to protect users, security, service stability, or legal obligations.",
        ],
      },
      {
        heading: "Changes, limits, and availability",
        body: [
          "Cerise Scholar may change features, policies, AI models, quotas, providers, prices, and availability during beta.",
          "Limits, usage quotas, monthly pass amounts, file-size limits, AI capacity limits, or budget controls may apply now or later.",
        ],
      },
      {
        heading: "Disclaimers and liability limits",
        body: [
          "Cerise Scholar is provided during beta on a reasonable-efforts basis without a promise that it will be uninterrupted, error-free, or suitable for every research need.",
          "To the fullest extent allowed by law, Cerise Scholar is not responsible for indirect, incidental, special, consequential, or punitive damages, lost work, lost profits, or decisions made from unverified outputs.",
        ],
      },
      {
        heading: "Contact",
        body: [
          `For legal, account, privacy, security, or support questions, contact ${LEGAL_CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  privacy: {
    key: "privacy",
    href: "/privacy",
    title: "Privacy Policy",
    shortTitle: "Privacy",
    summary:
      "How Cerise Scholar collects, uses, protects, shares, retains, and deletes account information, project data, uploaded files, AI prompts, and support records.",
    version: requiredBySlug.privacy.version,
    contentHash: requiredBySlug.privacy.content_hash,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    sections: [
      {
        heading: "Information collected",
        body: [
          "Cerise Scholar may collect account information, authentication provider data, project data, notes, highlights, uploaded files, extracted PDF text, AI prompts and context, AI responses, usage logs, security logs, support messages, and basic device or browser metadata.",
          "The exact data depends on the features you use and the research materials you choose to upload, paste, or generate.",
        ],
      },
      {
        heading: "Developer and app identity",
        body: [
          `The app is Cerise Scholar. Privacy, support, deletion, export, and security questions can be sent to ${LEGAL_CONTACT_EMAIL}.`,
          "The app name and privacy contact should remain consistent anywhere Cerise Scholar is submitted, distributed, or described.",
        ],
      },
      {
        heading: "How data is used",
        body: [
          "Data is used to provide accounts, store and sync your research workspace, process uploads, run AI features, provide support, maintain security, prevent abuse, improve reliability, debug issues, and comply with applicable obligations.",
          "Cerise Scholar does not sell personal data, research files, prompts, notes, uploaded files, or academic work.",
        ],
      },
      {
        heading: "Purpose, method, and scope",
        body: [
          "Purpose: Cerise Scholar processes personal information to create and protect accounts, operate the research workspace, save projects, process files, provide AI and study features, answer support requests, prevent abuse, and maintain reliability.",
          "Method: data is collected when you provide it, upload it, generate it, sign in with an authentication provider, contact support, or use app features that create technical logs. Some processing is handled by server-side services and trusted subprocessors.",
          "Scope: collection is limited to account, workspace, research, AI, support, usage, and security information needed for the features you use. Cerise Scholar does not request browser/device permissions for contacts, SMS, call logs, calendar, precise location, microphone, camera, or local file access unless a future feature clearly asks first.",
        ],
      },
      {
        heading: "Research files and private work",
        body: [
          "Uploaded files and project materials are private to your account or project unless sharing features are explicitly used.",
          "Cerise Scholar does not use your private research files, prompts, notes, or academic work for sale to third parties.",
        ],
      },
      {
        heading: "Background activity and permissions",
        body: [
          "Cerise Scholar is a web app. It does not intentionally collect personal information while the browser tab is closed, and it does not run mobile-device background collection.",
          "Security, hosting, authentication, and infrastructure providers may still generate server logs when requests reach the service, including for sign-in, page loads, API calls, abuse prevention, and troubleshooting.",
          "If a future mobile app, desktop app, browser extension, or background feature requests permissions or collects information in the background, Cerise Scholar should explain the purpose, method, and scope before that collection starts.",
        ],
      },
      {
        heading: "Vendors, providers, and SDK-like services",
        body: [
          "AI features may process selected context, prompts, notes, PDFs, abstracts, uploaded data summaries, or generated research context only to provide the feature you request.",
          "Current or planned providers may include Supabase for authentication, database, and storage; Cloudflare for traffic routing, security, and hosting protection; Google for OAuth and Workspace support if used; Ollama or Ollama Cloud for AI tasks; Kimi/API if enabled later for selected AI tasks; Microsoft Edge TTS for text-to-speech if used; and OpenAlex for public scholarly metadata search.",
          "Provider processing is also governed by the applicable provider terms and privacy practices. Cerise Scholar should avoid adding risky, unmaintained, or unnecessary SDK-like services and should update or remove providers that create security or privacy risk.",
        ],
      },
      {
        heading: "Consent before account creation",
        body: [
          "The signup flow uses a legal agreement step before account creation or Google OAuth begins. The agreement must give users a clear way to agree or reject, and consent boxes should not be selected by default.",
          "If you reject the agreement, account creation should not continue. Existing users should retain a recovery path such as signing out, retrying, or contacting support.",
        ],
      },
      {
        heading: "Sensitive personal information",
        body: [
          "Use extra caution with sensitive personal information, including government IDs, health information, precise location, financial information, biometric data, confidential employment or student records, private third-party data, credentials, and unpublished sensitive research data.",
          "Cerise Scholar does not need most sensitive personal information to create an account. Upload or prompt with sensitive materials only when necessary, lawful, and appropriate for your research workflow.",
        ],
      },
      {
        heading: "Retention, deletion, and export",
        body: [
          "Account and project data may be retained while your account is active or while needed to provide the service, maintain security, resolve support issues, comply with obligations, or preserve audit-friendly records.",
          `You can request deletion or export assistance by contacting ${LEGAL_CONTACT_EMAIL}. Some backups, logs, and security records may remain for a limited time where needed for recovery, security, fraud prevention, or legal reasons.`,
        ],
      },
      {
        heading: "Security measures",
        body: [
          "Cerise Scholar uses authentication, access controls, private storage patterns, row-level security, rate limits, server-side secrets, and audit-friendly records to protect the workspace.",
          "No system can guarantee perfect security. Browser extensions, malware, compromised devices, reused passwords, third-party apps, and unsafe sharing outside Cerise Scholar can still create risk.",
        ],
      },
      {
        heading: "User responsibilities",
        body: [
          "Protect your device, browser, email account, OAuth provider account, password manager, and network access.",
          "Do not upload highly sensitive personal, regulated, confidential, or third-party data unless it is necessary and you have the right to process it in Cerise Scholar.",
        ],
      },
      {
        heading: "Contact",
        body: [
          `For privacy, deletion, export, or support questions, contact ${LEGAL_CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  "ai-data-use": {
    key: "ai-data-use",
    href: "/ai-data-use",
    title: "AI Data Use Notice",
    shortTitle: "AI Data Use",
    summary:
      "How Cerise Scholar uses selected research context for AI features, with data minimization, local-first goals, and clear user responsibility for verification.",
    version: requiredBySlug["ai-data-use"].version,
    contentHash: requiredBySlug["ai-data-use"].content_hash,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    sections: [
      {
        heading: "Context AI features may process",
        body: [
          "AI features may process selected project context, research questions, notes, PDFs, abstracts, uploaded data summaries, citations, highlighted text, or user prompts.",
          "The app should send only the context needed for the requested feature when possible.",
        ],
      },
      {
        heading: "Data minimization",
        body: [
          "Cerise Scholar is designed to prefer focused, task-relevant context instead of sending entire workspaces by default.",
          "Some features may require larger document excerpts, extracted text, or metadata to produce a useful answer. You choose what to upload and what to ask the AI tools to process.",
        ],
      },
      {
        heading: "Local-first direction",
        body: [
          "Cerise Scholar aims to use local-first or local AI agents where practical for privacy, cost control, and resilience.",
          "Cloud AI providers may still be used for selected tasks when local processing is unavailable, not suitable, or not yet implemented.",
        ],
      },
      {
        heading: "No sale of research content",
        body: [
          "Cerise Scholar does not sell user prompts, files, notes, uploaded data, project data, or academic work.",
          "AI processing is used to provide requested app features, not to sell a user's research materials.",
        ],
      },
      {
        heading: "AI can make mistakes",
        body: [
          "AI outputs can include hallucinations, incorrect citations, missing context, biased summaries, or outdated claims.",
          "Users must verify sources, quotations, citations, calculations, conclusions, and final academic or professional work.",
        ],
      },
      {
        heading: "Sensitive data caution",
        body: [
          "Do not upload highly sensitive data unless it is necessary and you have permission to process it.",
          "Avoid placing secrets, credentials, private medical data, protected student records, confidential client data, or unpublished third-party data into prompts unless you understand and accept the risk.",
        ],
      },
      {
        heading: "No hidden background AI processing",
        body: [
          "AI processing should be tied to app features you choose to use, such as asking a question, summarizing a source, generating study support, running OCR, or creating text-to-speech output.",
          "Cerise Scholar should not silently send private research materials to AI providers from the background without a product reason and clear notice.",
        ],
      },
      {
        heading: "AI logs",
        body: [
          "Cerise Scholar should avoid storing raw private content in AI logs where practical and should prefer operational metadata, redaction, or minimized records when debugging and monitoring.",
          "Some technical logs may still be needed for reliability, safety, abuse prevention, and support.",
        ],
      },
    ],
  },
  "beta-terms": {
    key: "beta-terms",
    href: "/beta-terms",
    title: "Beta Participation Terms",
    shortTitle: "Beta Terms",
    summary:
      "What approved beta users should expect: limited availability, changing features, AI quotas, feedback, support, and access safeguards.",
    version: requiredBySlug["beta-terms"].version,
    contentHash: requiredBySlug["beta-terms"].content_hash,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    sections: [
      {
        heading: "Limited public beta",
        body: [
          "Cerise Scholar is preparing for a limited public beta for approved users. Access may be invitation-based, capacity-limited, or paused while the product is being improved.",
          "Beta participation does not guarantee permanent access, unchanged features, or production-level availability.",
        ],
      },
      {
        heading: "Incomplete and changing features",
        body: [
          "Features may be incomplete, delayed, experimental, unavailable, renamed, redesigned, or removed during beta.",
          "Professional data jobs, AI agents, file processing, or longer research workflows may queue, fail, retry, or take time as capacity is built.",
        ],
      },
      {
        heading: "AI credits, quotas, and capacity",
        body: [
          "AI credits, quotas, rate limits, file-size limits, model access, and capacity limits may apply now or later to protect the service and manage cost.",
          "Approved users may receive broad AI access during beta, but Cerise Scholar may add budget controls and usage limits as the product grows.",
        ],
      },
      {
        heading: "Feedback",
        body: [
          "Beta feedback, bug reports, suggestions, and support messages may be used to improve Cerise Scholar.",
          "Cerise Scholar does not sell personal research content, prompts, notes, uploaded files, or academic work as part of using beta feedback.",
        ],
      },
      {
        heading: "Support and bug reports",
        body: [
          `Users can report bugs, confusing flows, privacy concerns, security concerns, or support issues by contacting ${LEGAL_CONTACT_EMAIL}.`,
          "Include enough detail to help reproduce the issue, but avoid sending private research materials unless needed for support.",
        ],
      },
      {
        heading: "Access pause or removal",
        body: [
          "Beta access can be paused, limited, or removed for abuse, security issues, policy violations, legal risk, provider limits, or operational needs.",
          "Where practical, Cerise Scholar will aim to preserve a recovery path for legitimate users affected by accidental consent, login, or access issues.",
        ],
      },
    ],
  },
};

export const legalDocumentList = [
  legalDocuments.terms,
  legalDocuments.privacy,
  legalDocuments["ai-data-use"],
  legalDocuments["beta-terms"],
];

export const privacySecurityCommitment: TrustPageContent = {
  href: "/about/privacy-security",
  title: "Privacy & Security Commitment",
  summary:
    "A plain, reassuring overview of how Cerise Scholar protects research work, uses data to provide features, and keeps privacy expectations clear.",
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      heading: "We do not sell your research",
      body: [
        "Cerise Scholar does not sell personal data, research files, prompts, notes, uploaded files, or academic work.",
        "Data is used to provide the research workspace, account access, AI features, support, safety, security, and product reliability.",
      ],
    },
    {
      heading: "Your workspace stays private",
      body: [
        "Uploaded files are private to the user or project unless sharing features are explicitly used.",
        "Private storage, authentication, access controls, and account-scoped records are used to keep workspace data separated from other users.",
      ],
    },
    {
      heading: "AI uses selected context",
      body: [
        "AI features use selected research context to help with summaries, explanations, extraction, drafting support, and other research workflows.",
        "Cerise Scholar aims to minimize the data sent to AI systems and use only what is needed for the requested feature.",
      ],
    },
    {
      heading: "Clear consent first",
      body: [
        "During waitlist signup, Cerise Scholar asks users to review and accept the Terms of Service and Privacy Policy before creating the waitlist account.",
        "AI Data Use and Beta Participation notices remain available for public review and may be confirmed before protected workspace access.",
        "The agreement should use clear accept and reject choices, with no consent boxes selected by default.",
      ],
    },
    {
      heading: "Deletion and export requests",
      body: [
        `Users can request data deletion or export assistance by contacting ${LEGAL_CONTACT_EMAIL}.`,
        "Some security logs, backups, and audit-friendly records may remain for a limited time where needed for safety, recovery, or legal obligations.",
      ],
    },
    {
      heading: "Shared responsibility",
      body: [
        "Cerise Scholar uses authentication, access controls, private storage, and audit-friendly records, but users should also protect their own devices and accounts.",
        "Leaks caused by malware, unsafe browser extensions, compromised email accounts, shared devices, weak passwords, or third-party apps outside Cerise Scholar's control are not caused by Cerise Scholar.",
      ],
    },
  ],
};

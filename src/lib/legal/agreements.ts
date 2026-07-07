export type AgreementKey = "terms" | "privacy";

export type AgreementDocument = {
  title: string;
  shortTitle: string;
  updated: string;
  intro: string;
  sections: Array<{
    heading: string;
    body: string | string[];
  }>;
};

export const agreementDocuments: Record<AgreementKey, AgreementDocument> = {
  terms: {
    title: "Terms of Use",
    shortTitle: "Terms",
    updated: "July 7, 2026",
    intro:
      "These Terms of Use explain how to use the Cerise Scholar public beta responsibly, what you keep ownership of, how hosted research and AI features work, and what limits apply while the product is still growing.",
    sections: [
      {
        heading: "1. Agreement to these terms",
        body: [
          "These Terms of Use govern your access to and use of Cerise Scholar, including the website, signup and login flows, hosted research features, account features, help pages, public beta features, and AI features routed through supported providers.",
          "By creating an account, signing in, clicking to accept these terms, or using Cerise Scholar, you agree to these Terms of Use and to the Privacy Policy. If you do not agree, do not use Cerise Scholar.",
          "Cerise Scholar is currently a public beta. Some features may change, be limited, be unavailable on some devices, or require account, project, or AI setup before they work fully.",
        ],
      },
      {
        heading: "2. Eligibility and account responsibility",
        body: [
          "You should use Cerise Scholar only if you are old enough to form a binding agreement in your location or if a parent, guardian, school, or other authorized organization has permitted your use.",
          "You agree to provide accurate account information and keep it current. You are responsible for the activity that happens through your account, including activity from any device where you stay signed in.",
          "Keep your login method, email account, device password, and account sessions secure. If you believe someone has accessed your account or project workspace without permission, sign out of affected sessions and contact support.",
        ],
      },
      {
        heading: "3. Hosted beta and account security",
        body: [
          "Cerise Scholar is designed as a hosted research workflow. You may sign in from supported browsers and devices, but you remain responsible for using devices and networks that are appropriate for your research materials.",
          "Do not use shared, public, borrowed, school-lab, cafe, library, or employer-controlled computers for private research unless you have permission and understand the privacy risk.",
          "You are responsible for deciding whether a device, account, network, or file is appropriate for your research work and for following any school, employer, funder, ethics-board, or data-use rules that apply.",
        ],
      },
      {
        heading: "4. AI lanes and connected keys",
        body: [
          "Cerise Scholar may provide an included fair-use AI lane and an own-key lane. If you connect an OpenRouter key, AI requests may be billed to your OpenRouter account according to that provider's terms and pricing.",
          "Connected keys are validated, encrypted server-side, and shown only in masked form inside Cerise Scholar. You are responsible for the keys you provide, the providers you use, and any costs that provider charges.",
          "You can disconnect your own key in Settings > AI. The included lane may have request limits, and the own-key lane may depend on your provider account, model availability, balance, and provider policies.",
        ],
      },
      {
        heading: "5. Hosted services and third-party providers",
        body: [
          "Some Cerise Scholar features use hosted services. For example, Cerise Scholar may use Supabase for authentication, account records, app data, and project storage; OpenAlex for scholarly source discovery; and OpenRouter or configured AI providers for AI inference.",
          "Third-party services may have their own terms, policies, availability limits, and security practices. Cerise Scholar is not responsible for third-party services that it does not control, but we try to design the product so hosted processing is clear and limited to what is needed for the feature you choose.",
          "Links to outside websites, documentation, software installers, or academic sources are provided for convenience and research support. You are responsible for deciding whether to rely on any outside resource.",
        ],
      },
      {
        heading: "6. Your content and ownership",
        body: [
          "You keep ownership of the research materials, notes, files, prompts, project data, citations, drafts, and outputs you create or bring into Cerise Scholar. These Terms do not transfer ownership of your research to Cerise Scholar.",
          "You give Cerise Scholar a limited permission to process your content only as needed to provide, secure, maintain, debug, and support the service and the features you request. For hosted workflows, selected data may be sent to hosted services as described in the Privacy Policy.",
          "You are responsible for making sure you have the right to upload, process, quote, summarize, or otherwise use any paper, dataset, file, image, source, or other material that you bring into Cerise Scholar.",
        ],
      },
      {
        heading: "7. AI output and research responsibility",
        body: [
          "Cerise Scholar can help brainstorm research questions, summarize sources, organize notes, draft text, compare claims, prepare literature review material, and support analysis. AI-generated output may still be incomplete, inaccurate, outdated, biased, poorly cited, or unsuitable for your assignment, publication, field, or research method.",
          "You remain responsible for reviewing all outputs before relying on them. Check source claims, citation details, quotations, statistical reasoning, ethics requirements, authorship rules, and academic integrity policies that apply to you.",
          "Do not treat Cerise Scholar as a substitute for professional advice, faculty supervision, legal review, medical judgment, ethics-board review, financial advice, or independent scholarly judgment.",
        ],
      },
      {
        heading: "8. Academic integrity",
        body: [
          "Use Cerise Scholar in a way that is honest and permitted by your institution, instructor, journal, employer, funder, or research setting. If your course, publication, or workplace requires disclosure of AI assistance, you are responsible for making that disclosure.",
          "Do not use Cerise Scholar to fabricate sources, misrepresent authorship, hide prohibited assistance, generate fraudulent data, evade plagiarism detection, or submit work that violates academic rules.",
          "Cerise Scholar may help you understand, organize, and write, but the final responsibility for your work remains with you.",
        ],
      },
      {
        heading: "9. Acceptable use",
        body: [
          "You agree to use Cerise Scholar lawfully, respectfully, and only for purposes you are authorized to pursue. You may not disrupt the service, bypass security controls, scrape or overload hosted systems, probe accounts or local workspaces that are not yours, or interfere with another person's use of Cerise Scholar.",
          "You may not upload, generate, or process content that is unlawful; infringes intellectual property, privacy, or publicity rights; contains malware; attempts credential theft; or is intended to harass, exploit, or harm others.",
          "You may not reverse engineer, copy, resell, or use Cerise Scholar to build a competing service except where applicable law gives you a non-waivable right to do so.",
        ],
      },
      {
        heading: "10. Beta availability and changes",
        body: [
          "Cerise Scholar is offered during a public beta and may change quickly. We may add, remove, rename, pause, rate-limit, or redesign features as we improve the product, protect users, manage infrastructure, or respond to legal or security concerns.",
          "We may temporarily block or limit certain AI workflows if an allowance, connected key, provider, model, security check, or account setup is not ready. Those limits are intended to protect your account, your research data, and the beta service.",
          "We may stop offering the beta or a specific feature at any time. When practical, we will try to provide notice for material changes.",
        ],
      },
      {
        heading: "11. Suspension and termination",
        body: [
          "You may stop using Cerise Scholar at any time. You may also request deletion of account data as described in the Privacy Policy.",
          "We may suspend or terminate access if we believe you violated these terms, created risk for the service or other users, used the beta unlawfully, attempted unauthorized access, or created a security or abuse concern.",
          "After termination, provisions that by their nature should continue will continue, including ownership, privacy, acceptable use, disclaimers, limits of liability, and dispute-related terms.",
        ],
      },
      {
        heading: "12. Disclaimers",
        body: [
          "Cerise Scholar is provided on an as-is and as-available basis. To the maximum extent permitted by law, we do not promise that the service will be uninterrupted, error-free, secure, or that AI outputs, source suggestions, citations, summaries, analyses, or generated drafts will be accurate or fit for your purpose.",
          "Hosted tools depend on providers, APIs, infrastructure, browsers, networks, models, and availability outside your direct control.",
          "You are responsible for backups of important files and research work. Do not rely on Cerise Scholar as your only copy of important research materials.",
        ],
      },
      {
        heading: "13. Limitation of liability",
        body: [
          "To the maximum extent permitted by law, Cerise Scholar will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost data, lost research opportunities, academic consequences, publication consequences, or interruption of work arising from or related to your use of the service.",
          "Some jurisdictions do not allow certain limitations, so parts of this section may not apply to you. In those cases, liability is limited to the fullest extent permitted by applicable law.",
        ],
      },
      {
        heading: "14. Changes to these terms",
        body: [
          "We may update these Terms of Use as Cerise Scholar changes. When we update them, we will change the updated date above and, when appropriate, provide additional notice in the app, by email, or during account flow.",
          "Your continued use of Cerise Scholar after updated terms take effect means you accept the updated terms.",
        ],
      },
      {
        heading: "15. Contact",
        body:
          "Questions about these terms can be sent to cerisescholar@gmail.com. These beta terms are written for clarity and product transparency; they should be reviewed by qualified counsel before a broad commercial launch.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    shortTitle: "Privacy",
    updated: "July 7, 2026",
    intro:
      "This Privacy Policy explains what Cerise Scholar collects, how hosted services and AI providers are used, and what choices you have during the public beta.",
    sections: [
      {
        heading: "1. Summary",
        body: [
          "Cerise Scholar is designed as a hosted research workspace. Project records and selected research materials may be stored through Cerise Scholar's hosted app and Supabase-backed workflows.",
          "AI requests may be sent to OpenRouter or configured AI providers through the included lane or your connected key. We do not sell your personal information, and we do not use your private source files, prompts, or outputs to train Cerise Scholar models.",
          "You can browse public pages such as the homepage, Help, Terms, and Privacy pages without creating an account. We do collect and process the account, authentication, consent, security, support, metadata, and hosted-feature information needed to operate the beta when you sign up, sign in, contact us, or use app features.",
        ],
      },
      {
        heading: "2. Personally identifiable information",
        body: [
          "Personally identifiable information means information that identifies or can reasonably be linked to a person, such as a name, email address, phone number, account identifier, mailing or home address, authentication details, device or network identifiers, support message content, or other information tied to your account or request.",
          "Cerise Scholar tries to collect only what is needed for the product feature, account flow, support request, security purpose, or beta operation at issue.",
        ],
      },
      {
        heading: "3. Information you provide",
        body: [
          "When you create or use an account, we may process information you provide, such as your email address, authentication provider details, name, phone number, address details if you choose to provide them, profile fields, consent records, waitlist or signup answers, support messages, and email update preferences.",
          "If you contact us for help, we process the information in your message so we can understand and respond. Please do not include private source files, sensitive research data, passwords, authentication codes, or unrelated personal information in support messages unless we specifically ask for the minimum needed to solve a support issue.",
          "Email may not be secure against interception. If a support question is sensitive, avoid sending passwords, full datasets, private source files, health information, financial information, government identifiers, or other sensitive personal data by ordinary email.",
          "If you opt in to email updates, we may use your email address to send product updates, beta announcements, setup reminders, and research workflow tips. We use those email preferences for the topics or notices you selected, and you can opt out where the email or account flow provides that choice.",
        ],
      },
      {
        heading: "4. Information collected automatically",
        body: [
          "When you visit or use Cerise Scholar, we may automatically process technical information such as IP address, browser type, device characteristics, operating system, referring pages, approximate region, timestamps, session events, error logs, security events, and basic usage metadata.",
          "This may include the internet domain or network from which you access the app, the IP address used to access the app, browser and operating-system details, the date and time of access, URLs or app pages visited, referring URLs, login username or account identifier where applicable, and diagnostic information needed to investigate a known security, abuse, or reliability issue.",
          "This information helps us keep the beta available, protect accounts, debug errors, understand which pages and features need improvement, prevent abuse, maintain security, and manage the app. Raw logs are kept only as long as reasonably needed for those purposes, subject to backup, legal, security, and operational needs.",
          "We may use cookies or similar browser storage for essential authentication, session, security, and product functionality. Disabling browser storage may prevent parts of Cerise Scholar from working.",
        ],
      },
      {
        heading: "5. Project files and AI activity",
        body: [
          "Project files, notes, prompts, metadata, outputs, and usage events may be processed when needed for the features you choose. Cerise Scholar should ask only for information relevant to the requested workflow.",
          "AI usage events may record details such as feature, lane, served model, token estimates, and timestamp so the app can meter included usage and show own-key users an honest monthly count.",
          "Your own OpenRouter key, if connected, is encrypted server-side. Cerise Scholar displays only a masked version and should not expose the plaintext key back to the browser after connection.",
        ],
      },
      {
        heading: "6. Hosted research features",
        body: [
          "Some features may use hosted services. Hosted features may process research questions, selected snippets, source metadata, project metadata, prompts, outputs, or other context you submit so that the requested feature can work.",
          "ScholarAsk or related source-discovery features may query OpenAlex for scholarly metadata and source discovery. AI features may send selected prompts and context to OpenRouter or configured AI providers for inference.",
          "Where possible, Cerise Scholar is designed to keep hosted processing limited to the feature you choose. The app should not process more project material than needed for the requested workflow.",
        ],
      },
      {
        heading: "7. How we use information",
        body: [
          "We use information to create and authenticate accounts, operate Cerise Scholar, provide requested research and AI features, save preferences, respond to support, send product communications you requested or allowed, improve reliability, debug errors, meter AI usage, and protect the service from abuse.",
          "We also use information to enforce terms, comply with legal obligations, investigate security issues, maintain backups and logs, and understand whether the beta is working smoothly for students and researchers.",
          "We do not use your private source files, prompts, or outputs to train Cerise Scholar models.",
        ],
      },
      {
        heading: "8. How information is shared",
        body: [
          "We do not sell your personal information. We may share or process information with service providers that help us run Cerise Scholar, such as authentication, database, hosting, email, analytics, logging, security, source-discovery, and AI-inference providers.",
          "Examples of providers or service categories may include Supabase for authentication and app data, OpenAlex for scholarly source lookup, configured AI providers for hosted AI features, and infrastructure or email tools used to operate the beta. We expect service providers to process information only for the work they perform for Cerise Scholar and to protect it appropriately.",
          "We may also disclose information if required by law, legal process, or a valid request from public authorities; to protect the rights, safety, and security of Cerise Scholar, users, or others; to investigate abuse; or in connection with a reorganization, merger, acquisition, or similar business transfer.",
        ],
      },
      {
        heading: "9. Third-party websites and external links",
        body: [
          "Cerise Scholar may link to outside websites, documentation, academic sources, third-party apps, or provider pages. Those websites and services are not controlled by Cerise Scholar and may have their own privacy, security, accessibility, and data-use practices.",
          "When you leave Cerise Scholar for an outside website, the outside site's policy applies. Review that policy before providing personal information, installing software, or connecting an account.",
          "If Cerise Scholar uses third-party tools for optional surveys, feedback, analytics, email subscriptions, or product communications, those tools should be used for the stated purpose and not to collect unrelated personal information.",
        ],
      },
      {
        heading: "10. What we do not collect during signup",
        body: [
          "During signup, Cerise Scholar does not ask for contacts, SMS, call logs, calendar access, browser location access, microphone, or camera permissions.",
          "Google login, when available, is used for authentication. It does not by itself give Cerise Scholar access to your Gmail, Drive, calendar, contacts, microphone, camera, or location. Any future feature that needs a separate permission should ask separately and explain why.",
          "Cerise Scholar does not need your device password, OpenRouter dashboard password, or unrelated account credentials.",
        ],
      },
      {
        heading: "11. Retention and deletion",
        body: [
          "We keep account, consent, security, support, and service records for as long as needed to provide the beta, operate the app, comply with legal obligations, resolve disputes, enforce terms, protect against abuse, and maintain reasonable backups.",
          "Project records, usage events, support messages, and hosted files may remain until deleted or de-identified according to account settings, support processes, provider limits, backups, legal duties, and operational needs.",
          "If you request account deletion, we will delete or de-identify account data where required and where we no longer need it for legal, security, backup, fraud-prevention, or legitimate operational reasons.",
        ],
      },
      {
        heading: "12. Security",
        body: [
          "We use reasonable technical and organizational measures intended to protect Cerise Scholar accounts and hosted systems. No internet service, browser session, model provider, or storage system can be guaranteed perfectly secure.",
          "Security measures may include access controls, authentication controls, encryption where appropriate, logging, backups, monitoring, provider safeguards, and limits on who can access operational data for support, security, or maintenance needs.",
          "You can help protect your research by using trusted devices, keeping your operating system and browser updated, protecting your passwords, signing out on shared devices, avoiding public computers for private source files, and keeping your own backups of important work.",
          "If we learn of a security issue that affects your account or data, we will evaluate the issue and provide notice where required by applicable law.",
        ],
      },
      {
        heading: "13. Your privacy choices and rights",
        body: [
          "Depending on where you live, you may have rights to request access, correction, deletion, portability, objection, restriction, or withdrawal of consent for certain personal information.",
          "You can also choose not to use AI features, choose not to provide optional profile fields, opt out of optional emails where offered, disconnect your own AI key, and avoid uploading source files unless you want the related hosted processing.",
          "To ask about privacy rights or account deletion, contact cerisescholar@gmail.com. We may need to verify your identity before acting on certain requests.",
        ],
      },
      {
        heading: "14. Children and students",
        body: [
          "Cerise Scholar is built for students and researchers, but it is not intended to knowingly collect personal information from children where parental, guardian, school, or legal consent is required.",
          "If you believe a child provided personal information without appropriate consent, contact us so we can review and take appropriate action.",
        ],
      },
      {
        heading: "15. International processing",
        body:
          "Cerise Scholar and its service providers may process information in the United States or other locations where infrastructure and providers operate. Privacy laws may differ from the laws where you live. Where required, we use appropriate safeguards for cross-border processing.",
      },
      {
        heading: "16. Changes to this policy",
        body: [
          "We may update this Privacy Policy as Cerise Scholar changes. When we update it, we will change the updated date above and, when appropriate, provide additional notice in the app, by email, or during account flow.",
          "Your continued use of Cerise Scholar after an updated policy takes effect means the updated policy applies to your use going forward.",
        ],
      },
      {
        heading: "17. Contact",
        body:
          "Questions about this Privacy Policy or privacy requests can be sent to cerisescholar@gmail.com. This beta policy is written for clarity and product transparency; it should be reviewed by qualified counsel before a broad commercial launch.",
      },
      {
        heading: "18. Plain-language boundaries",
        body: [
          "Hosted account, project, AI, and source-discovery features may process the selected information needed for the feature. Cerise Scholar does not sell your personal information. Cerise Scholar does not train its models on your private source files, prompts, or outputs.",
          "If a future feature changes these boundaries, the product should explain that change clearly before asking you to use it.",
        ],
      },
    ],
  },
};

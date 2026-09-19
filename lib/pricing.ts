/**
 * ScopeGrade AI pricing engine.
 *
 * Pure, dependency-free logic shared by the workspace UI, the persistence layer
 * and the unit tests. Changing a package price or a qualification rule should
 * only ever require an edit in this file.
 */

export type ProjectType = "landing" | "business" | "ecommerce" | "webapp";

export type PackageName = "Promotional" | "Professional" | "Custom";

export type Grade = "A" | "B" | "C";

export type ProjectInput = {
  projectName: string;
  clientName: string;
  clientEmail: string;
  projectType: ProjectType;
  pages: number;
  sections: number;
  contentReady: boolean;
  bilingual: boolean;
  booking: boolean;
  payments: boolean;
  clientLogin: boolean;
  customDesign: boolean;
  rush: boolean;
  maintenance: boolean;
  notes: string;
};

export type Assessment = {
  packageName: PackageName;
  grade: Grade;
  price: number;
  range: string;
  score: number;
  reasons: string[];
  included: string[];
  extras: string[];
};

/** Fixed price of the advertised promotional offer. */
export const PROMOTIONAL_PRICE = 99.99;

/** Monthly Website Care Plan, free for the first month after launch. */
export const CARE_PLAN_MONTHLY = 97;

/** Deposit required before production is scheduled. */
export const DEFAULT_DEPOSIT_PERCENTAGE = 50;

/** Days a proposal stays open for acceptance. */
export const PROPOSAL_VALID_DAYS = 14;

/** Complexity score at or above which a project leaves the Professional tier. */
export const CUSTOM_SCORE_THRESHOLD = 16;

/** Advertised starting price of the Professional package. */
export const PROFESSIONAL_BASE_PRICE = 699;

/** Advertised starting price of a Custom website project. */
export const CUSTOM_BASE_PRICE = 1699;

/** Advertised starting price of a Custom web application. */
export const WEBAPP_BASE_PRICE = 2499;

const CARE_PLAN_LINE = `Website Care Plan — $${CARE_PLAN_MONTHLY}/month after the free first month`;

export const initialProjectInput: ProjectInput = {
  projectName: "",
  clientName: "",
  clientEmail: "",
  projectType: "landing",
  pages: 1,
  sections: 4,
  contentReady: true,
  bilingual: false,
  booking: false,
  payments: false,
  clientLogin: false,
  customDesign: false,
  rush: false,
  maintenance: true,
  notes: "",
};

export const projectTypes: Array<{ value: ProjectType; label: string; detail: string }> = [
  { value: "landing", label: "Landing page", detail: "Single focused page" },
  { value: "business", label: "Business website", detail: "Multi-page presence" },
  { value: "ecommerce", label: "Online store", detail: "Products and payments" },
  { value: "webapp", label: "Web application", detail: "Accounts and workflows" },
];

export const pricingRules: Array<{
  name: string;
  price: string;
  grade: Grade;
  description: string;
  tone: string;
}> = [
  {
    name: "Promotional Website",
    price: "$99.99",
    grade: "A",
    description: "One page, up to 4 sections, standard contact features, no advanced integrations.",
    tone: "promo",
  },
  {
    name: "Professional Website",
    price: "From $699",
    grade: "B",
    description: "Multi-page business website with optional bilingual, booking and payment integrations.",
    tone: "professional",
  },
  {
    name: "Custom Project",
    price: "From $1,699",
    grade: "C",
    description: "E-commerce, customer accounts, web applications or projects requiring discovery.",
    tone: "custom",
  },
];

/** Formats a number as USD, hiding cents when the value is a whole amount. */
export function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
}

/** Deposit owed on a project value, rounded to cents. */
export function depositAmount(value: number, percentage: number) {
  return Math.round(value * percentage) / 100;
}

/** Date a proposal created now stops accepting a decision, as `YYYY-MM-DD`. */
export function defaultValidUntil(from: Date = new Date()) {
  return new Date(from.getTime() + PROPOSAL_VALID_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/** Weighted complexity of a request. Higher means further from the promo offer. */
export function complexityScore(form: ProjectInput) {
  let score = { landing: 1, business: 5, ecommerce: 13, webapp: 17 }[form.projectType];
  score += Math.max(0, form.pages - 1);
  score += Math.max(0, form.sections - 4) * 0.5;
  score += form.bilingual ? 3 : 0;
  score += form.booking ? 3 : 0;
  score += form.payments ? 5 : 0;
  score += form.clientLogin ? 7 : 0;
  score += form.customDesign ? 3 : 0;
  score += form.rush ? 2 : 0;
  score += form.contentReady ? 0 : 2;
  return score;
}

function qualifiesAsPromotional(form: ProjectInput) {
  return (
    form.projectType === "landing" &&
    form.pages === 1 &&
    form.sections <= 4 &&
    !form.bilingual &&
    !form.booking &&
    !form.payments &&
    !form.clientLogin &&
    !form.customDesign &&
    !form.rush
  );
}

function qualifiesAsProfessional(form: ProjectInput, score: number) {
  return (
    (form.projectType === "landing" || form.projectType === "business") &&
    score < CUSTOM_SCORE_THRESHOLD &&
    !form.clientLogin
  );
}

/** Grades a request and returns the recommended package, price and reasoning. */
export function assessProject(form: ProjectInput): Assessment {
  const score = complexityScore(form);

  if (qualifiesAsPromotional(form)) {
    return {
      packageName: "Promotional",
      grade: "A",
      price: PROMOTIONAL_PRICE,
      range: `${money(PROMOTIONAL_PRICE)} fixed scope`,
      score: Math.round(score),
      reasons: [
        "One-page website with a focused goal",
        "Four or fewer standard content sections",
        "No advanced integrations or custom workflows",
      ],
      included: [
        "Responsive one-page website",
        "Up to 4 content sections",
        "Contact form + WhatsApp button",
        "Delivery target: 5 business days",
      ],
      extras: form.maintenance ? [CARE_PLAN_LINE] : [],
    };
  }

  if (qualifiesAsProfessional(form, score)) {
    // Only the add-ons are rounded, so a request with no add-ons still quotes
    // the advertised starting price exactly.
    let extras = Math.max(0, form.pages - 5) * 125;
    extras += form.bilingual ? 250 : 0;
    extras += form.booking ? 300 : 0;
    extras += form.payments ? 450 : 0;
    extras += form.customDesign ? 350 : 0;
    extras += form.contentReady ? 0 : 150;

    let price = PROFESSIONAL_BASE_PRICE + Math.round(extras / 25) * 25;
    if (form.rush) price = Math.round((price * 1.25) / 25) * 25;

    return {
      packageName: "Professional",
      grade: "B",
      price,
      range: `${money(price)} recommended`,
      score: Math.round(score),
      reasons: [
        form.pages > 1
          ? `${form.pages}-page website requires expanded design and navigation`
          : "The requested scope exceeds the promotional package",
        form.bilingual
          ? "Bilingual content adds an additional production pass"
          : "Professional presentation and custom layout are required",
        form.booking || form.payments
          ? "Business integration requires setup and testing"
          : "Scope remains within a standard business website",
      ],
      included: [
        `Up to ${Math.max(5, form.pages)} professionally designed pages`,
        "Mobile, tablet and desktop optimization",
        "Contact and lead capture setup",
        "Basic on-page SEO foundation",
      ],
      extras: [
        form.bilingual ? "English + Spanish content structure" : "",
        form.booking ? "Booking or appointment integration" : "",
        form.payments ? "Payment integration" : "",
        form.maintenance ? CARE_PLAN_LINE : "",
      ].filter(Boolean),
    };
  }

  const base = form.projectType === "webapp" ? WEBAPP_BASE_PRICE : CUSTOM_BASE_PRICE;
  let extras = Math.max(0, form.pages - 5) * 150;
  extras += form.bilingual ? 300 : 0;
  extras += form.booking ? 350 : 0;
  extras += form.payments ? 600 : 0;
  extras += form.clientLogin ? 900 : 0;
  extras += form.customDesign ? 500 : 0;
  extras += form.contentReady ? 0 : 250;

  let price = base + Math.round(extras / 50) * 50;
  if (form.rush) price = Math.round((price * 1.25) / 50) * 50;

  return {
    packageName: "Custom",
    grade: "C",
    price,
    range: `Starting at ${money(price)}`,
    score: Math.round(score),
    reasons: [
      form.projectType === "ecommerce"
        ? "Online selling introduces products, checkout and payment workflows"
        : form.projectType === "webapp"
          ? "User accounts and application workflows require custom development"
          : "The combination of features exceeds a standard website build",
      form.clientLogin
        ? "Secure customer accounts require authentication and protected data"
        : "Multiple advanced integrations require dedicated testing",
      "A discovery session is required before a fixed proposal",
    ],
    included: [
      "Project discovery and technical scope",
      "Custom interface and responsive experience",
      "Integration setup and quality assurance",
      "Milestone-based delivery plan",
    ],
    extras: [
      form.payments ? "Secure payment workflow" : "",
      form.clientLogin ? "Customer login and protected portal" : "",
      form.bilingual ? "Bilingual interface structure" : "",
      form.maintenance ? "Custom care plan after launch" : "",
    ].filter(Boolean),
  };
}

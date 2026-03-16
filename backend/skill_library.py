# ==============================================================
# skill_library.py
# Unified multi-domain skills list (extendable)
# ==============================================================

TECH_SKILLS = [
    # Core
    "python", "java", "javascript", "typescript", "c", "c++", "c#", "go", "rust", "kotlin", "swift",
    "html", "css", "sass", "less", "sql", "nosql",
    # Web/App
    "react", "next.js", "vue", "nuxt", "angular", "redux", "node.js", "express", "fastapi", "flask", "django",
    "graphql", "rest api", "webpack", "vite",
    # Cloud/DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible", "linux", "ci/cd", "git", "github actions",
    # Data/ML/AI
    "numpy", "pandas", "scikit-learn", "matplotlib", "seaborn",
    "tensorflow", "pytorch", "keras", "xgboost", "lightgbm",
    "nlp", "bert", "transformers", "hugging face", "computer vision", "opencv",
    "airflow", "dbt", "spark", "hadoop", "hive",
    # Databases
    "mysql", "postgresql", "mssql", "mongodb", "redis", "elasticsearch", "snowflake", "bigquery", "redshift",
]

DATA_SCIENCE_SKILLS = [
    "data analysis", "data science", "statistics", "bayesian inference", "hypothesis testing",
    "feature engineering", "model deployment", "mlops", "ab testing", "time series", "recommendation systems",
    "power bi", "tableau", "looker", "excel", "power query", "dax",
]

MARKETING_SKILLS = [
    "seo", "sem", "ppc", "google ads", "bing ads", "meta ads",
    "content strategy", "copywriting", "email marketing",
    "marketing automation", "hubspot", "mailchimp", "crm",
    "google analytics", "analytics", "ga4",
    "social media marketing", "brand management", "product marketing",
]


FINANCE_SKILLS = [
    "financial modeling", "fp&a", "valuation", "equity research",
    "accounting", "audit", "taxation", "sap", "oracle financials", "tally",
    "risk analysis", "budgeting", "forecasting", "compliance",
]

HEALTHCARE_SKILLS = [
    "emr", "ehr", "patient care", "clinical research", "hipaa",
    "medical billing", "icd-10", "cpt coding", "triage", "diagnosis",
]

SALES_SKILLS = [
    "lead generation", "b2b sales", "b2c sales", "negotiation",
    "account management", "crm", "salesforce", "pipeline management",
    "cold calling", "demo", "closing",
]

HR_SKILLS = [
    "talent acquisition", "recruitment", "onboarding",
    "payroll", "compensation", "hr analytics", "performance management", "l&d", "employee relations",
]

DESIGN_SKILLS = [
    "ui design", "ux design", "figma", "adobe xd", "photoshop", "illustrator", "indesign",
    "wireframing", "prototyping", "design systems", "usability testing",
]

LEGAL_SKILLS = [
    "contract drafting", "legal research", "compliance", "ip law",
    "litigation", "corporate law", "privacy", "gdpr",
]

GENERAL_SKILLS = [
    "project management", "scrum", "agile", "kanban", "stakeholder management",
    "documentation", "communication", "leadership", "time management", "problem solving",
]

SKILL_ALIASES = {
    "google analytics": {"analytics", "ga", "ga4"},
    "sem": {"google ads", "paid search"},
    "seo": {"search engine optimization"},
    "rest api": {"rest apis", "restapi", "restapis"},
    "ci/cd": {"cicd", "ci cd", "continuous integration"},
    "javascript": {"js"},
    "typescript": {"ts"},
}


MASTER_SKILL_LIBRARY = sorted(set(
    TECH_SKILLS + DATA_SCIENCE_SKILLS + MARKETING_SKILLS + FINANCE_SKILLS +
    HEALTHCARE_SKILLS + SALES_SKILLS + HR_SKILLS + DESIGN_SKILLS +
    LEGAL_SKILLS + GENERAL_SKILLS
))

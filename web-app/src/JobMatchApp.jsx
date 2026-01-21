import React, { useState, useMemo, useCallback } from "react";
import {
  FileText,
  Upload,
  Trash2,
  Zap,
  LayoutList,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import axios from "axios";
const pdfjsLib = await import("pdfjs-dist/build/pdf");
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Button = ({
  children,
  onClick,
  className = "",
  disabled = false,
  type = "button",
  icon: Icon,
  variant = "primary",
}) => {
  let baseClass = "app-button";

  if (variant === "primary") {
    baseClass += " app-button-primary";
  } else if (variant === "danger") {
    baseClass += " app-button-danger";
  } else if (variant === "secondary") {
    baseClass += " app-button-secondary";
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${className} ${
        disabled ? "app-button-disabled" : ""
      }`}
    >
      {Icon && <Icon size={20} />} <span>{children}</span>{" "}
    </button>
  );
};

const toPct = (x) => Math.max(0, Math.min(100, (Number(x) || 0) * 100));
const badgeClass = (p) =>
  p >= 80
    ? "score-badge score-good"
    : p >= 60
      ? "score-badge score-ok"
      : "score-badge score-low";
const toInt = (val) => {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : null;
};

// --- Page Components ---

// FIX: Added setCurrentPage to the destructured props
const JobDescriptionPage = ({
  jobDescription,
  setJobDescription,
  setCurrentPage,
}) => {
  return (
    <div className="page-wrapper">
      {" "}
      <div className="content-card">
        <h2 className="content-card-title">Define the Job</h2>{" "}
        <p className="content-card-subtitle">
          Enter the Job Title and the complete Job Description below. This
          information is crucial for accurately matching resumes.{" "}
        </p>{" "}
        <div className="space-y-6">
          {" "}
          <div>
            {" "}
            <label htmlFor="jobTitle" className="form-label">
              Job Title{" "}
            </label>{" "}
            <input
              type="text"
              id="jobTitle"
              value={jobDescription.title}
              onChange={(e) =>
                setJobDescription((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              className="form-input"
              placeholder="e.g., Senior Frontend Developer"
            />{" "}
          </div>{" "}
          <div>
            {" "}
            <label htmlFor="jobDescription" className="form-label">
              Job Description (Required Skills, Experience,
              Responsibilities){" "}
            </label>{" "}
            <textarea
              id="jobDescription"
              rows="15"
              value={jobDescription.description}
              onChange={(e) =>
                setJobDescription((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="form-textarea"
              placeholder="Paste the full job description here. Include key requirements, technologies, and team details."
            />{" "}
          </div>
          {}{" "}
          <div className="flex justify-end">
            {" "}
            <Button
              variant="primary"
              icon={CheckCircle}
              onClick={() => setCurrentPage("cvs")}
              disabled={!jobDescription.title || !jobDescription.description}
            >
              Description Ready{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};

const CVUploadPage = ({ files, setFiles, jobDescription, setCurrentPage }) => {
  const isJobDescriptionReady =
    !!jobDescription.title && !!jobDescription.description;

  const handleFileUpload = useCallback(
    (e) => {
      const uploadedFiles = Array.from(e.target.files);
      const newFiles = uploadedFiles.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        status: "Pending",
        isAnalyzed: false,
        score: null,
        content: file,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [setFiles],
  );

  const handleRemoveFile = useCallback(
    (id) => {
      setFiles((prev) => prev.filter((file) => file.id !== id));
    },
    [setFiles],
  );

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const StatusDisplay = ({ status, isAnalyzed }) => {
    if (isAnalyzed) {
      return (
        <div className="status-analyzed">
          <CheckCircle size={14} className="mr-1" />
          Analyzed!
        </div>
      );
    }
    return (
      <div className="status-pending">
        <LayoutList size={14} className="mr-1" /> {status}
      </div>
    );
  };

  // 🧠 NEW: analyze resume by calling Flask API
  // 🔍 Analyze resume using Flask backend
  const analyzeResume = async (fileObj) => {
    try {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id ? { ...f, status: "Reading file..." } : f,
        ),
      );

      // Convert PDF → text
      const text = await readFileAsText(fileObj.content);

      if (!text || text.trim().length < 50) {
        throw new Error("Extracted resume text is empty or too short");
      }

      // Step 1: Send to /parse
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id ? { ...f, status: "Parsing resume..." } : f,
        ),
      );
      const parsedRes = await axios.post(`${API_BASE_URL}/parse_resume`, {
        text,
      });

      // Step 2: Send parsed text + JD to /match
      // Step 2: Send parsed resume + JD to /match (BERT model)
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id
            ? { ...f, status: "Matching JD with BERT..." }
            : f,
        ),
      );
      const matchRes = await axios.post(`${API_BASE_URL}/match`, {
        resume_text: text,
        jd_text: jobDescription.description,
      });

      const parsedResume = matchRes.data?.parsed_resume || {};
      const parsedJD = matchRes.data?.parsed_jd || {};
      const match = matchRes.data?.match || {};

      // hybrid score (0–1)
      const hybridScore = Number(match.domain_match_score || 0);

      // skills overlap
      const rSkills = new Set(
        (parsedResume.skills || []).map((s) => s.toLowerCase()),
      );
      const jSkills = new Set(
        (parsedJD.required_skills || []).map((s) => s.toLowerCase()),
      );
      const matchedSkills = [...rSkills]
        .filter((s) => jSkills.has(s))
        .map((s) => s[0].toUpperCase() + s.slice(1));
      const missingSkills = [...jSkills]
        .filter((s) => !rSkills.has(s))
        .map((s) => s[0].toUpperCase() + s.slice(1));

      // experience match (A + C)
      const ry = toInt(parsedResume.experience_years);
      const jy = toInt(parsedJD.required_years);
      let expMatch = "Unknown";
      if (ry != null && jy != null) {
        expMatch = ry >= jy ? "Meets/Exceeds" : "Below";
      }

      // role match (D)
      const roleMatch = match.roles_boost_applied
        ? "Likely aligned"
        : "Unclear";
      const topRoles = (parsedResume.roles || []).slice(0, 3);

      // candidate info (E)
      const contact = parsedResume.candidate_info || {};

      // parsed sections (G)
      const sections = parsedResume.sections || {};

      // short reasoning (Detail level 2)
      const pct = Math.round(hybridScore * 100);
      const reasoning = [
        `Score ${pct}% from hybrid similarity.`,
        matchedSkills.length
          ? `Matched skills: ${matchedSkills.slice(0, 8).join(", ")}`
          : `Few direct skill matches.`,
        missingSkills.length
          ? `Missing skills: ${missingSkills.slice(0, 8).join(", ")}`
          : `No major skills missing.`,
        `Experience: ${expMatch}${
          ry != null
            ? ` (candidate ${ry} yrs${jy != null ? ` vs req ${jy} yrs` : ""})`
            : ""
        }.`,
        `Role alignment: ${roleMatch}${
          topRoles.length ? ` (e.g., ${topRoles.join(", ")})` : ""
        }.`,
      ].join(" ");

      // ✅ new scoring JSON format
      const relevanceScore = matchRes.data.match?.domain_match_score ?? 0;

      // Step 3: Send results to /bias_check (optional bias model)
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id ? { ...f, status: "Checking bias model..." } : f,
        ),
      );

      // let biasCheck = null;
      // try {
      //   const biasRes = await axios.post(`${API_BASE_URL}/bias_check`, {
      //     resume_text: text,
      //     jd_text: jobDescription.description,
      //   });
      //   biasCheck = biasRes.data.bias_score ?? "N/A";
      // } catch (err) {
      //   console.warn("Bias check failed:", err);
      // }

      // Step 4: Update UI
      // Default fallback reasoning if required fields missing
      const fallbackReasoning = `Candidate scored ${pct}% relevance based on semantic similarity to the job description. More detailed insights unavailable due to limited structured information in the resume.`;

      // ✅ Ensure insights always exist — never undefined
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id
            ? {
                ...f,
                status: "Done",
                isAnalyzed: true,
                score: hybridScore,
                insights: {
                  matchedSkills: matchedSkills || [],
                  missingSkills: missingSkills || [],
                  expMatch: expMatch || "Unknown",
                  roleMatch: roleMatch || "Unknown",
                  contact: contact || {},
                  sections: sections || {},
                  reasoning: reasoning || fallbackReasoning, // ✅ guaranteed explanation
                  embeddingCosine: match.embedding_cosine ?? 0,
                  skillJaccard: match.skill_overlap_jaccard ?? 0,
                },
              }
            : f,
        ),
      );
    } catch (err) {
      console.error("Error analyzing resume:", err);

      let message = "Unexpected error occurred";

      if (err.response) {
        // Backend responded (400 / 500)
        message =
          err.response.data?.error || `Server error (${err.response.status})`;
      } else if (err.request) {
        // No response from backend
        message = "Backend not reachable";
      } else {
        message = err.message;
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id ? { ...f, status: `❌ ${message}` } : f,
        ),
      );
    }
  };

  // 🧩 Helper: convert PDF to text using pdf.js (client-side)
  // 📄 Read PDF as plain text using pdf.js
  const readFileAsText = async (file) => {
    const pdfjsLib = await import("pdfjs-dist/build/pdf");

    // ✅ Vite-safe worker resolution
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.js",
      import.meta.url,
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }

    if (!text || text.trim().length < 50) {
      throw new Error("Extracted resume text is empty");
    }

    return text;
  };

  const analyzeAllResumes = async () => {
    for (const file of files) {
      if (!file.isAnalyzed) {
        await analyzeResume(file);
      }
    }
    setFiles((prev) =>
      [...prev].sort((a, b) => (b.score || 0) - (a.score || 0)),
    );
    setCurrentPage("dashboard");
  };

  return (
    <div className="page-wrapper">
      <div className="cv-upload-container">
        {/* File Upload Area */}
        <div className="content-card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="content-card-title">
              Uploaded Files ({files.length})
            </h2>
          </div>

          {!isJobDescriptionReady && (
            <div className="alert-warning">
              <AlertTriangle size={24} className="alert-icon" />
              <div>
                <h3 className="alert-title">Job Description Required</h3>
                <p className="alert-text">
                  Please go back to "Define Job" and fill it before analyzing
                  CVs.
                </p>
              </div>
            </div>
          )}
          <label
            htmlFor="file-upload"
            className={`drag-drop-area ${
              isJobDescriptionReady ? "drag-drop-active" : "drag-drop-inactive"
            }`}
          >
            <Upload size={36} className="mx-auto mb-3" />
            <p className="font-semibold text-lg">
              Drag & Drop files here or Click to Browse
            </p>
            <p className="text-sm text-gray-500">
              Only PDF files up to 5MB are supported.
            </p>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={!isJobDescriptionReady}
              className="hidden"
            />
          </label>
        </div>

        {/* File List */}
        <div className="content-card">
          <div className="flex items-center mb-6">
            <h2 className="content-card-title">
              Uploaded Files ({files.length})
            </h2>

            <Button
              variant="primary"
              icon={Zap}
              disabled={!isJobDescriptionReady || files.length === 0}
              onClick={analyzeAllResumes}
              className="!py-2 !px-5"
            >
              Analyze All
            </Button>
          </div>

          {files.length === 0 ? (
            <p className="text-center text-gray-500 py-10">
              No resumes uploaded yet.
            </p>
          ) : (
            <ul className="file-list">
              {files.map((file) => (
                <li key={file.id} className="file-list-item">
                  <div className="file-info">
                    <FileText size={24} className="file-icon" />
                    <div className="min-w-0">
                      <p className="file-name">{file.name}</p>
                      <p className="file-size">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="file-actions">
                    {file.isAnalyzed ? (
                      <span className="status-analyzed">
                        Score: {(file.score * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <StatusDisplay
                        status={file.status}
                        isAnalyzed={file.isAnalyzed}
                      />
                    )}
                    <Button
                      onClick={() => handleRemoveFile(file.id)}
                      variant="secondary"
                      className="remove-button"
                      icon={Trash2}
                    ></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const DashboardPage = ({ files }) => {
  const analyzed = useMemo(
    () =>
      [...files]
        .filter((f) => f.isAnalyzed)
        .sort((a, b) => (b.score || 0) - (a.score || 0)),
    [files],
  );

  if (analyzed.length === 0) {
    return (
      <div className="page-wrapper">
        <div className="content-card">
          <h2 className="content-card-title">Dashboard</h2>
          <p className="text-gray-600">
            Analyze some resumes to see results here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="content-card">
        <h2 className="content-card-title">Dashboard</h2>

        <ul className="dash-list">
          {analyzed.map((f, idx) => {
            const p = toPct(f.score);
            const c = f.insights?.contact || {};
            const head = c.name && c.name !== "N/A" ? c.name : f.name;
            const email = c.email && c.email !== "N/A" ? c.email : "";
            const phone = c.phone && c.phone !== "N/A" ? c.phone : "";

            return (
              <li key={f.id} className="dash-item">
                <details>
                  <summary className="dash-summary">
                    <div className="dash-left">
                      <span className={badgeClass(p)}>{p.toFixed(1)}%</span>
                      <span className="dash-name">{head}</span>
                      <span className="dash-meta">
                        {email && <span>{email}</span>}
                        {email && phone && <span> · </span>}
                        {phone && <span>{phone}</span>}
                      </span>
                    </div>
                    <div className="dash-right">
                      <span className="dash-rank">#{idx + 1}</span>
                    </div>
                  </summary>

                  <div className="dash-body">
                    <div className="dash-block">
                      <h4>Reasoning</h4>
                      <p className="dash-text">{f.insights?.reasoning}</p>
                    </div>

                    <div className="dash-grid">
                      <div className="dash-block">
                        <h4>Matched Skills</h4>
                        {f.insights?.matchedSkills?.length ? (
                          <div className="chip-wrap">
                            {f.insights.matchedSkills.map((s) => (
                              <span key={s} className="chip chip-good">
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="dash-muted">None detected.</p>
                        )}
                      </div>

                      <div className="dash-block">
                        <h4>Missing Skills</h4>
                        {f.insights?.missingSkills?.length ? (
                          <div className="chip-wrap">
                            {f.insights.missingSkills.map((s) => (
                              <span key={s} className="chip chip-warn">
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="dash-muted">No major gaps.</p>
                        )}
                      </div>
                    </div>

                    <div className="dash-grid">
                      <div className="dash-block">
                        <h4>Experience Match</h4>
                        <p className="dash-text">
                          {f.insights?.expMatch || "Unknown"}
                        </p>
                      </div>
                      <div className="dash-block">
                        <h4>Role Alignment</h4>
                        <p className="dash-text">
                          {f.insights?.roleMatch || "Unclear"}
                        </p>
                      </div>
                    </div>

                    <div className="dash-block">
                      <h4>Resume Sections</h4>
                      <div className="sec-wrap">
                        {Object.entries(f.insights?.sections || {})
                          .slice(0, 6)
                          .map(([k, v]) => (
                            <div key={k} className="sec-item">
                              <div className="sec-title">{k}</div>
                              <div className="sec-text">
                                {String(v).slice(0, 400)}
                                {String(v).length > 400 ? "…" : ""}
                              </div>
                            </div>
                          ))}
                        {!f.insights?.sections && (
                          <p className="dash-muted">No sections parsed.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [currentPage, setCurrentPage] = useState("job");
  const [jobDescription, setJobDescription] = useState({
    title: "",
    description: "",
  });
  const [files, setFiles] = useState([]);

  const CSS_STYLES = `
        /* Global Styles */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

        body {
            margin: 0;
            font-family: 'Inter', sans-serif;
            background-color: #f8f9fa; /* Soft off-white background */
        }

        #root, .app-container {
            min-height: 100vh;
        }

        /* Header and Navigation */
        .app-header {
            position: sticky;
            top: 0;
            z-index: 10;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header-content {
            max-width: 1280px;
            margin: 0 auto;
            padding: 1rem 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        @media (min-width: 768px) {
            .header-content {
                flex-direction: row;
                justify-content: space-between;
            }
        }

        .app-title {
            font-size: 1.875rem; /* 3xl */
            font-weight: 800; /* extabold */
            color: #1f2937; /* gray-900 */
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
        }

        .app-title-icon {
            color: #2563eb; /* blue-600 */
            margin-right: 0.5rem;
            width: 30px;
            height: 30px;
        }

        .app-nav {
            display: flex;
            gap: 0.5rem;
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
            font-weight: 600;
            border-radius: 0.75rem; /* rounded-xl */
            transition: all 0.2s ease-in-out;
            transform: translateY(0);
            border: none;
            cursor: pointer;
        }

        .nav-item:hover {
            transform: translateY(-2px);
        }

        .nav-item-active {
            background-color: #2563eb; /* blue-600 */
            color: #ffffff;
            box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.5), 0 4px 6px -2px rgba(37, 99, 235, 0.5); /* custom shadow */
        }

        .nav-item-inactive {
            color: #374151; /* gray-700 */
            background-color: transparent;
        }

        .nav-item-inactive:hover {
            background-color: #f3f4f6; /* gray-100 */
        }

        /* Main Content and Cards */
        .main-content {
            max-width: 1280px;
            margin: 0 auto;
            padding: 1.5rem 1rem 2.5rem 1rem;
        }

        .page-wrapper {
            padding: 1rem 0;
            display: flex;
            justify-content: center;
        }

        .content-card {
            width: 100%;
            max-width: 64rem; /* max-w-4xl */
            background-color: #ffffff;
            padding: 1.5rem;
            border-radius: 0.75rem; /* rounded-xl */
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); /* shadow-2xl */
            transition: box-shadow 0.5s ease-in-out;
        }

        .content-card:hover {
            box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.35); /* shadow-3xl equivalent */
        }

        @media (min-width: 768px) {
            .content-card {
                padding: 2.5rem;
            }
        }

        .content-card-title {
            font-size: 1.875rem; /* 3xl */
            font-weight: 800;
            color: #1f2937;
            margin-bottom: 1.5rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid #e5e7eb;
        }

        .content-card-subtitle {
            color: #4b5563; /* gray-600 */
            margin-bottom: 1.5rem;
        }

        /* Forms */
        .form-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151; /* gray-700 */
            margin-bottom: 0.5rem;
        }

        .form-input, .form-textarea {
            width: 100%;
            border: 1px solid #d1d5db; /* gray-300 */
            border-radius: 0.5rem; /* rounded-lg */
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); /* shadow-sm */
            padding: 0.75rem;
            transition: all 0.15s ease-in-out;
            resize: vertical;
        }

        .form-input:focus, .form-textarea:focus {
            outline: none;
            border-color: #3b82f6; /* blue-500 */
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
        }

        /* Buttons */
        .app-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
            font-weight: 600;
            transition: all 0.3s ease-in-out;
            transform: translateY(0);
            border-radius: 0.75rem; /* rounded-xl */
            border: none;
            cursor: pointer;
            margin: 1em;
        }

        .app-button:hover {
            transform: translateY(-2px);
        }

        .app-button-primary {
            background-color: #2563eb; /* blue-600 */
            color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(37, 99, 235, 0.5);
        }

        .app-button-primary:hover {
            background-color: #1d4ed8; /* blue-700 */
        }

        .app-button-disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }

        /* CV Upload Page Specific Styles */

        .cv-upload-container {
            width: 100%;
            max-width: 64rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .alert-warning {
            background-color: #fffbeb; /* yellow-50 */
            border-left: 4px solid #fbbf24; /* yellow-400 */
            color: #92400e; /* yellow-800 */
            padding: 1rem;
            margin-bottom: 1.5rem;
            border-radius: 0.5rem;
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .alert-icon {
            color: #f59e0b; /* yellow-500 */
            flex-shrink: 0;
            margin-top: 2px;
        }

        .alert-title {
            font-size: 1.125rem;
            font-weight: 600;
        }

        .alert-text {
            font-size: 0.875rem;
        }

        .drag-drop-area {
            display: block;
            width: 90%;
            padding: 3rem;
            text-align: center;
            border: 2px dashed;
            border-radius: 0.75rem; /* rounded-xl */
            transition: all 0.3s ease-in-out;
            cursor: pointer;
        }

        .drag-drop-active {
            border-color: #93c5fd; /* blue-300 */
            color: #2563eb; /* blue-600 */
        }

        .drag-drop-active:hover {
            border-color: #3b82f6; /* blue-500 */
            background-color: #eff6ff; /* blue-50 */
        }

        .drag-drop-inactive {
            border-color: #d1d5db; /* gray-300 */
            color: #9ca3af; /* gray-400 */
            background-color: #f9fafb; /* gray-50 */
            cursor: not-allowed;
        }

        /* File List */
        .file-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .file-list-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            background-color: #f9fafb; /* gray-50 */
            border: 1px solid #e5e7eb; /* gray-200 */
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            transition: box-shadow 0.2s;
        }

        .file-list-item:hover {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .file-info {
            display: flex;
            align-items: center;
            gap: 1rem;
            min-width: 0;
            flex: 1;
        }

        .file-icon {
            color: #3b82f6; /* blue-500 */
            flex-shrink: 0;
        }

        .file-name {
            font-weight: 500;
            color: #1f2937;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .file-size {
            font-size: 0.875rem;
            color: #6b7280; /* gray-500 */
        }

        .file-actions {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-shrink: 0;
        }

        /* Status Badges */
        .status-analyzed, .status-pending {
            display: flex;
            align-items: center;
            font-weight: 600;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px; /* full rounded */
            font-size: 0.75rem;
        }

        .status-analyzed {
            color: #059669; /* green-600 */
            background-color: #d1fae5; /* green-100 */
        }

        .status-pending {
            color: #4b5563; /* gray-600 */
            background-color: #f3f4f6; /* gray-100 */
        }

        .remove-button {
            padding: 0.5rem;
            height: 40px;
            width: 40px;
            background-color: #fee2e2; /* red-100 */
            color: #dc2626; /* red-600 */
            box-shadow: none;
            border-radius: 0.5rem;
            transition: background-color 0.2s, transform 0.2s;
        }

        .remove-button:hover {
            background-color: #fecaca; /* red-200 */
            transform: translateY(-2px);
        }

        /* ✅ Fix alignment for Uploaded Files + Analyze All row */
.file-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* ✅ Override the default title spacing for this row */
.file-list-header .content-card-title {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

/* Score badge */
.score-badge{display:inline-flex;align-items:center;justify-content:center;min-width:64px;padding:.25rem .5rem;border-radius:9999px;font-weight:700}
.score-good{background:#dcfce7;color:#166534}
.score-ok{background:#fef9c3;color:#854d0e}
.score-low{background:#fee2e2;color:#7f1d1d}

/* Dashboard */
.dash-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1rem}
.dash-item details{border:1px solid #e5e7eb;border-radius:.75rem;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.dash-summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 1.25rem;cursor:pointer}
.dash-summary::-webkit-details-marker{display:none}
.dash-left{display:flex;align-items:center;gap:.75rem;min-width:0}
.dash-name{font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:38ch}
.dash-meta{color:#6b7280;font-size:.9rem}
.dash-right .dash-rank{font-weight:800;color:#9ca3af}
.dash-body{padding:1rem 1.25rem 1.25rem;border-top:1px solid #e5e7eb}
.dash-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem}
.dash-block h4{font-weight:700;margin:0 0 .35rem 0;color:#111827}
.dash-text{color:#374151}
.dash-muted{color:#6b7280}
.chip-wrap{display:flex;flex-wrap:wrap;gap:.5rem}
.chip{display:inline-flex;align-items:center;border-radius:9999px;padding:.25rem .6rem;font-size:.85rem}
.chip-good{background:#e0f2fe;color:#075985}
.chip-warn{background:#fff7ed;color:#9a3412}

/* Sections */
.sec-wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem}
.sec-item{border:1px solid #e5e7eb;border-radius:.75rem;padding:.75rem;background:#f9fafb}
.sec-title{font-weight:700;color:#111827;margin-bottom:.25rem;text-transform:capitalize}
.sec-text{color:#374151;font-size:.95rem;white-space:pre-wrap}


    `;

  const renderPage = useMemo(() => {
    switch (currentPage) {
      case "job":
        return (
          <JobDescriptionPage
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            setCurrentPage={setCurrentPage}
          />
        );
      case "cvs":
        return (
          <CVUploadPage
            files={files}
            setFiles={setFiles}
            jobDescription={jobDescription}
            setCurrentPage={setCurrentPage}
          />
        );
      case "dashboard":
        return <DashboardPage files={files} />;

      default:
        return (
          <JobDescriptionPage
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            setCurrentPage={setCurrentPage}
          />
        );
    }
  }, [currentPage, jobDescription, files]);

  const NavItem = ({ page, label, icon: Icon }) => {
    const isActive = currentPage === page;
    const activeClass = "nav-item-active";
    const inactiveClass = "nav-item-inactive";

    return (
      <button
        onClick={() => setCurrentPage(page)}
        className={`nav-item ${isActive ? activeClass : inactiveClass}`}
      >
        <Icon size={20} /> <span>{label}</span>{" "}
      </button>
    );
  };

  return (
    <div className="app-container">
      {}
      <style dangerouslySetInnerHTML={{ __html: CSS_STYLES }} /> {}{" "}
      <header className="app-header">
        {" "}
        <div className="header-content">
          {" "}
          <h1 className="app-title">
            <Zap size={30} className="app-title-icon" />
            NextHire AI{" "}
          </h1>{" "}
          <nav className="app-nav">
            {" "}
            <NavItem page="job" label="Define Job" icon={FileText} />
            <NavItem page="cvs" label="Upload CVs" icon={Upload} />{" "}
            <NavItem page="dashboard" label="Dashboard" icon={LayoutList} />
          </nav>{" "}
        </div>{" "}
      </header>
      {} <main className="main-content">{renderPage}</main>{" "}
    </div>
  );
};

export default App;

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/index.css";
import {
  FileText,
  Upload,
  Trash2,
  Zap,
  LayoutList,
  CheckCircle,
  AlertTriangle,
  House,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import api from "../api/api";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import AlertPopup from "../components/AlertPopup";
import ConfirmDialog from "../components/ConfirmDialog";

// Renders a reusable themed button used across the workspace UI.
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

// Converts a fractional score (0-1) to a clamped percentage.
const toPct = (x) => Math.max(0, Math.min(100, (Number(x) || 0) * 100));
// Chooses a score badge style based on score severity.
const badgeClass = (p) =>
  p >= 80
    ? "score-badge score-good"
    : p >= 60
      ? "score-badge score-ok"
      : "score-badge score-low";
// Safely casts unknown values to a finite number.
const toNum = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

// Collects and saves job title + description before resume upload.
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
              onClick={async () => {
                try {
                  const res = await api.post("/jobs", jobDescription);
                  setJobDescription((prev) => ({
                    ...prev,
                    id: res.data.id,
                  }));
                  setCurrentPage("cvs");
                } catch (err) {
                  console.error("Failed to create job", err);
                }
              }}
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

// Handles file upload, PDF parsing, and candidate analysis actions.
const CVUploadPage = ({ files, setFiles, jobDescription, setCurrentPage }) => {
  const isJobDescriptionReady =
    !!jobDescription.title && !!jobDescription.description;

  const handleFileUpload = useCallback(
    (e) => {
      const uploadedFiles = Array.from(e.target.files);
      e.target.value = null;
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

  // Shows file analysis status badge in the upload list.
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
  // Runs end-to-end analysis for one uploaded resume.
  const analyzeResume = async (fileObj) => {
    try {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id ? { ...f, status: "Reading file..." } : f,
        ),
      );
      const text = await readFileAsText(fileObj.content);

      if (!text || text.trim().length < 50) {
        throw new Error("Extracted resume text is empty or too short");
      }
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id ? { ...f, status: "Parsing resume..." } : f,
        ),
      );
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id
            ? { ...f, status: "Matching JD with BERT..." }
            : f,
        ),
      );
      const candidateRes = await api.post("/candidates", {
        job_id: jobDescription.id, // for now assume single job
        name: fileObj.name,
        email: "",
        resume_text: text,
      });

      const candidateId = candidateRes.data.id;
      const analysisRes = await api.post(`/candidates/${candidateId}/analyze`);

      const report = analysisRes.data;

      const bias = report.bias || {};
      const hybridScore = Number(report.screening?.match?.final_score ?? 0);
      const matchedSkills = report.positive_signals || [];

      const missingSkills = report.readiness_checklist?.gaps || [];
      const expMatch =
        report.experience_analysis?.candidate_years >=
        report.experience_analysis?.required_years
          ? "Meets/Exceeds"
          : "Below";
      const roleMatch =
        report.skill_analysis?.required_matched > 0
          ? "Partially aligned"
          : "Unclear";
      const pct = Math.round(hybridScore * 100);

      const reasoning = `Score ${pct}% based on semantic similarity, skill overlap, role alignment, and seniority match.`;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id ? { ...f, status: "Checking bias model..." } : f,
        ),
      );
      const contact = {};
      const sections = {};
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id
            ? {
                ...f,
                rawText: text,
                candidateId: candidateId,
                status: "Done",
                isAnalyzed: true,
                score: hybridScore,
                bias: bias,
                insights: {
                  matchedSkills,
                  missingSkills,
                  expMatch,
                  roleMatch,
                  contact,
                  sections,
                  reasoning,
                  confidence: report.ai_confidence_meter?.score_percent ?? null,
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
          f.id === fileObj.id ? { ...f, status: `Error: ${message}` } : f,
        ),
      );
    }
  };
  // Extracts plain text from a PDF file in the browser.
  const readFileAsText = async (file) => {
    const pdfjsLib = await import("pdfjs-dist/build/pdf");
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

  // Processes every pending resume and opens the dashboard after sorting.
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

// Shows ranked candidates, score summary, and stage management controls.
const DashboardPage = ({
  files,
  setSelectedResume,
  setCurrentPage,
  jobDescription,
}) => {
  const [candidates, setCandidates] = useState([]);
  const analyzed = useMemo(() => {
    return candidates.map((c) => {
      const report = c.report_json || {};
      const screening = report.screening || {};
      const interview = report.interview || {};
      const match = screening.match || {};

      return {
        id: c.id,
        name: c.name,
        score: toNum(c.ai_score, 0) / 100,
        candidateId: c.id,
        stage: c.stage,

        insights: {
          reasoning: interview.interview_summary || c.recommendation,

          matchedSkills: match.matched_required_skills || [],

          missingSkills: match.missing_required_skills || [],

          expMatch:
            interview.experience_analysis?.candidate_years >=
            interview.experience_analysis?.required_years
              ? "Meets/Exceeds"
              : "Below",

          roleMatch: match.final_score >= 0.7 ? "Aligned" : "Weak",

          sections: screening.parsed_resume?.sections || {},
        },
      };
    });
  }, [candidates]);

  const stats = useMemo(() => {
    if (!candidates.length) return { avg: 0, shortlisted: 0 };

    const avg =
      candidates.reduce((sum, c) => sum + toNum(c.ai_score, 0), 0) /
      candidates.length;

    const shortlisted = candidates.filter(
      (c) => c.stage === "Shortlisted",
    ).length;

    return {
      avg: Math.round(avg),
      shortlisted,
    };
  }, [candidates]);

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const res = await api.get(`/candidates/job/${jobDescription.id}`);
        setCandidates(res.data);
      } catch (err) {
        console.error("Failed to load candidates", err);
      }
    };

    if (jobDescription?.id) {
      loadCandidates();
    }
  }, [jobDescription?.id]);

  const stages = [
    "Applied",
    "Shortlisted",
    "Interview",
    "Offer",
    "Hired",
    "Rejected",
  ];

  const updateStage = async (candidateId, newStage) => {
    try {
      await api.patch(`/candidates/${candidateId}/stage`, {
        stage: newStage,
      });

      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, stage: newStage } : c)),
      );
    } catch (err) {
      console.error("Failed to update stage", err);
    }
  };

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
        <h2 className="content-card-title-2">
          {jobDescription.title} — Candidates
        </h2>

        <div className="dashboard-stats">
          <div className="stat-card">
            <strong>{candidates.length}</strong>
            <span>Candidates</span>
          </div>

          <div className="stat-card">
            <strong>{stats.avg}%</strong>
            <span>Avg Score</span>
          </div>

          <div className="stat-card">
            <strong>{stats.shortlisted}</strong>
            <span>Shortlisted</span>
          </div>
        </div>

        <ul className="dash-list">
          {analyzed.map((f, idx) => {
            const p = toPct(f.score);
            const head = f.name;
            const email = candidates[idx]?.email || "";
            const phone = "";

            return (
              <li key={f.id} className="dash-item">
                <details>
                  <summary className="dash-summary">
                    <div className="dash-left">
                      <span className={badgeClass(p)}>{p.toFixed(1)}%</span>
                      <span className="dash-name">{head}</span>
                      {email && <span className="dash-meta">{email}</span>}
                    </div>
                    <div className="dash-right dash-controls">
                      <span className="dash-rank">#{idx + 1}</span>
                      <select
                        value={f.stage || "Applied"}
                        onChange={(e) => updateStage(f.id, e.target.value)}
                        className="stage-dropdown"
                      >
                        {stages.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        className="interview-btn"
                        onClick={() => {
                          setSelectedResume({
                            ...f,
                            candidateId: f.candidateId,
                          });
                          setCurrentPage("interview");
                        }}
                      >
                        Interview Assistant
                      </Button>
                    </div>
                  </summary>

                  <div className="dash-body">
                    {f.bias && !f.bias.bias_safe && (
                      <div
                        className="alert-warning"
                        style={{ marginBottom: "1rem" }}
                      >
                        ⚠ Bias-sensitive information detected in resume.
                        <br />
                        Matching score was <strong>not</strong> affected.
                      </div>
                    )}

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

// Displays detailed screening and interview intelligence for one candidate.
const InterviewPage = ({
  jobDescription,
  resumeText,
  candidateName,
  onExit,
  candidateId,
}) => {
  const [data, setData] = useState(null);
  const interview = data?.interview || {};
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterviewInsights = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/candidates/${candidateId}/report`);

        setData(res.data);
      } catch (err) {
        console.error("Failed to load interview assistant", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewInsights();
  }, [candidateId]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content-card">Generating interview report…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-wrapper">
        <div className="content-card">Failed to load interview report.</div>
      </div>
    );
  }

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="page-wrapper">
      <div className="content-card" id="interview-report">
        {/* TOP TITLE + EXPORT */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 className="content-card-title">Interview Intelligence Report</h2>
          <Button variant="secondary" onClick={exportPDF}>
            Export PDF
          </Button>
        </div>

        {/* ========================================================= */}
        {/* ================= FORMAL REPORT HEADER ================== */}
        {/* ========================================================= */}

        <div className="formal-line" />

        <div className="formal-title">Interview Report</div>

        <div className="formal-meta">
          <div>
            <strong>Candidate:</strong> {candidateName}
          </div>
          <div>
            <strong>Role:</strong> {jobDescription.title}
          </div>
          <div>
            <strong>Generated:</strong>{" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* ================= SECTION 1 ============================= */}
        {/* ========================================================= */}

        <div className="dash-block">
          <h3 className="report-section-title">
            SECTION 1 — Executive Summary
          </h3>

          <p>
            <strong>Interview Strategy:</strong> {interview.interview_strategy}
          </p>

          <p>{interview.interview_objective}</p>

          <div style={{ marginTop: "1rem" }}>
            <strong>AI Confidence:</strong>{" "}
            {interview.ai_confidence_meter?.score_percent ?? 0}% –{" "}
            {interview.ai_confidence_meter?.confidence_level}
          </div>

          <div style={{ marginTop: "0.5rem" }}>
            {interview.interview_summary}
          </div>
        </div>

        {/* ========================================================= */}
        {/* ================= SECTION 2 ============================= */}
        {/* ========================================================= */}

        <div className="dash-block">
          <h3 className="report-section-title">
            SECTION 2 — Risk & Fit Metrics
          </h3>

          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-value">
                {interview.risk_assessment?.risk_level}
              </div>
              <div className="metric-label">Risk Level</div>
            </div>

            <div className="metric-card">
              <div className="metric-value">
                {interview.risk_assessment?.risk_score}
              </div>
              <div className="metric-label">Risk Score</div>
            </div>

            <div className="metric-card">
              <div className="metric-value">
                {interview.skill_analysis?.required_matched} /{" "}
                {interview.skill_analysis?.required_total}
              </div>
              <div className="metric-label">Required Skills</div>
            </div>

            <div className="metric-card">
              <div className="metric-value">
                {interview.skill_analysis?.optional_matched} /{" "}
                {interview.skill_analysis?.optional_total}
              </div>
              <div className="metric-label">Optional Skills</div>
            </div>

            <div className="metric-card">
              <div className="metric-value">
                {interview.experience_analysis?.candidate_years}
              </div>
              <div className="metric-label">Candidate Years</div>
            </div>

            <div className="metric-card">
              <div className="metric-value">
                {interview.experience_analysis?.required_years}
              </div>
              <div className="metric-label">Required Years</div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ================= SECTION 3 ============================= */}
        {/* ========================================================= */}

        <div className="dash-block">
          <h3 className="report-section-title">SECTION 3 — Decision Signals</h3>

          <p>
            <strong>Readiness:</strong>{" "}
            {interview.readiness_checklist?.readiness_level}
          </p>

          <p>
            <strong>Hiring Signal:</strong>{" "}
            {interview.readiness_checklist?.hiring_signal}
          </p>

          <h4 style={{ marginTop: "1rem" }}>Positive Signals</h4>
          <ul>
            {(interview.positive_signals || []).map((s, i) => (
              <li key={i}>✅ {s}</li>
            ))}
          </ul>

          <h4 style={{ marginTop: "1rem" }}>Risk Signals</h4>
          <ul>
            {(interview.risk_signals || []).map((s, i) => (
              <li key={i}>⚠ {s}</li>
            ))}
          </ul>
        </div>

        {/* ========================================================= */}
        {/* ================= SECTION 4 ============================= */}
        {/* ========================================================= */}

        <div className="dash-block">
          <h3 className="report-section-title">
            SECTION 4 — Interview Question Framework
          </h3>

          {interview.interview_questions.map((q, i) => (
            <div
              key={i}
              className="sec-item"
              style={{ marginBottom: "1.5rem" }}
            >
              <p>
                <strong>Q{i + 1}:</strong> {q.question}
              </p>

              <h5>Strong Signals</h5>
              <ul>
                {q.strong_answer_signals.map((s, idx) => (
                  <li key={idx}>✅ {s}</li>
                ))}
              </ul>

              <h5>Weak Signals</h5>
              <ul>
                {q.weak_answer_signals.map((s, idx) => (
                  <li key={idx}>❌ {s}</li>
                ))}
              </ul>

              {q.follow_up && (
                <div className="followup-container">
                  <h5 className="followup-title">Adaptive Follow-Ups</h5>

                  <div className="followup-grid">
                    {q.follow_up.if_strong && (
                      <div className="followup-card strong">
                        <div className="followup-label">If Strong Answer</div>
                        <div className="followup-question">
                          ➜ {q.follow_up.if_strong.question}
                        </div>
                        <div className="followup-purpose">
                          Purpose: {q.follow_up.if_strong.purpose}
                        </div>
                      </div>
                    )}

                    {q.follow_up.if_weak && (
                      <div className="followup-card weak">
                        <div className="followup-label">If Weak Answer</div>
                        <div className="followup-question">
                          ➜ {q.follow_up.if_weak.question}
                        </div>
                        <div className="followup-purpose">
                          Purpose: {q.follow_up.if_weak.purpose}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ========================================================= */}
        {/* ================= SECTION 5 ============================= */}
        {/* ========================================================= */}

        {interview.interview_focus_areas?.length > 0 && (
          <div className="dash-block">
            <h3 className="report-section-title">
              SECTION 5 — Priority Focus Areas
            </h3>

            <div className="focus-grid">
              {interview.interview_focus_areas.map((area, i) => (
                <div key={i} className="focus-card">
                  <div className="focus-header">
                    <span className="focus-title">{area.title}</span>
                    <span
                      className={`focus-priority ${area.priority.toLowerCase()}`}
                    >
                      {area.priority}
                    </span>
                  </div>
                  <div className="focus-desc">{area.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ================= SECTION 6 ============================= */}
        {/* ========================================================= */}

        <div className="dash-block">
          <h3 className="report-section-title">
            SECTION 6 — Final Recommendation
          </h3>

          <div className="recommendation-card">
            <div className="recommendation-header">
              {interview.final_recommendation?.final_recommendation}
            </div>

            <p>{interview.final_recommendation?.recommendation_note}</p>

            <ul>
              {(interview.final_recommendation?.interviewer_guidance || []).map(
                (g, i) => (
                  <li key={i}>{g}</li>
                ),
              )}
            </ul>

            <p style={{ marginTop: "1rem" }}>
              {interview.final_recommendation?.bias_compliance}
            </p>
          </div>
        </div>

        {/* BOTTOM DIVIDER */}
        <div className="formal-line" style={{ marginTop: "2rem" }} />

        <div style={{ marginTop: "2rem" }}>
          <Button variant="primary" onClick={onExit}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

// Lists all jobs for the user and supports open/delete actions.
const JobsPage = ({ setCurrentPage, setJobDescription, setFiles }) => {
  const [jobs, setJobs] = useState([]);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [isDeletingJob, setIsDeletingJob] = useState(false);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const res = await api.get("/jobs");
        setJobs(res.data);
      } catch (err) {
        console.error("Failed to load jobs", err);
      }
    };

    loadJobs();
  }, []);

  const openJob = (job) => {
    setJobDescription(job);
    setFiles([]); // prevent cross-job resumes
    setCurrentPage("dashboard");
  };

  return (
    <div className="page-wrapper">
      <div className="content-card jobs-card">
        <h2 className="content-card-title">Your Jobs</h2>

        {jobs.length === 0 ? (
          <p>No jobs created yet.</p>
        ) : (
          <ul className="dash-list jobs-list">
            {jobs.map((job) => (
              <li key={job.id} className="dash-item jobs-item">
                <div className="dash-summary jobs-summary">
                  <div className="dash-left">
                    <span className="dash-name">{job.title}</span>
                  </div>

                  <div className="dash-right jobs-actions">
                    <Button
                      variant="secondary"
                      className="job-action-btn"
                      onClick={() => openJob(job)}
                    >
                      Open Job
                    </Button>

                    <Button
                      variant="danger"
                      className="job-action-btn"
                      onClick={() => setJobToDelete(job)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

      </div>
      <ConfirmDialog
        open={Boolean(jobToDelete)}
        title="Delete Job?"
        message={
          jobToDelete
            ? `This will permanently delete "${jobToDelete.title}" and all related candidates/reports.`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={isDeletingJob}
        onCancel={() => {
          if (isDeletingJob) return;
          setJobToDelete(null);
        }}
        onConfirm={async () => {
          if (!jobToDelete) return;
          try {
            setIsDeletingJob(true);
            await api.delete(`/jobs/${jobToDelete.id}`);
            setJobs((prev) => prev.filter((j) => j.id !== jobToDelete.id));
            setJobToDelete(null);
          } catch (err) {
            console.error("Delete failed", err);
          } finally {
            setIsDeletingJob(false);
          }
        }}
      />
    </div>
  );
};

// --- Main App Component ---

// Main authenticated workspace shell with fixed sidebar and top bar.
const App = ({ initialAuthPage = "login" }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState("jobs");
  const [jobDescription, setJobDescription] = useState({
    title: "",
    description: "",
  });
  const [files, setFiles] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [user, setUser] = useState(null);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [confirmHomeOpen, setConfirmHomeOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authPage, setAuthPage] = useState(initialAuthPage);
  const [popup, setPopup] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });
  const popupTimerRef = useRef(null);

  // Dismisses popup and clears any running dismiss timer.
  const closePopup = useCallback(() => {
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    setPopup((prev) => ({ ...prev, open: false }));
  }, []);

  // Shows a timed in-app alert message.
  const showAlert = useCallback(
    ({ type = "info", title = "Notification", message = "", duration = 3000 }) => {
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
      }

      setPopup({ open: true, type, title, message });
      popupTimerRef.current = setTimeout(() => {
        closePopup();
      }, duration);
    },
    [closePopup],
  );

  useEffect(() => {
    // Triggers one lightweight request so cold-started backend wakes up early.
    const wakeBackend = async () => {
      try {
        await fetch("https://nexthire-ai-1zdq.onrender.com/health", {
          method: "GET",
        });
        console.log("Backend awake");
      } catch (err) {
        console.warn("Backend still waking up...");
      }
    };

    wakeBackend();
  }, []);

  useEffect(
    () => () => {
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    // Loads the current user profile from API and falls back to cached local data.
    const token = localStorage.getItem("token");

    if (!token) return;

    const loadProfile = async () => {
      try {
        const res = await api.get("/auth/me");
        const me = res.data?.user || res.data;
        setUser({ loggedIn: true, ...me });
        localStorage.setItem("nh_user", JSON.stringify(me));
      } catch (err) {
        const raw = localStorage.getItem("nh_user");
        if (raw) {
          try {
            const cached = JSON.parse(raw);
            setUser({ loggedIn: true, ...cached });
            return;
          } catch (_) {
            setUser({ loggedIn: true, email: raw, name: raw.split("@")[0] });
            return;
          }
        }
        setUser({ loggedIn: true });
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    setAuthPage(initialAuthPage);
  }, [initialAuthPage]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Logs out and redirects the user to the login screen.
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("nh_user");
    setUser(null);
    navigate("/login");
  };

  // Navigates to landing page and clears auth state.
  const goHomeAndLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("nh_user");
    setUser(null);
    navigate("/");
  };

  const sidebarUser = useMemo(() => {
    if (user?.name || user?.email) {
      const name = user.name || user.email.split("@")[0] || "Recruiter";
      const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "R";
      return { name, initials };
    }

    try {
      const raw = localStorage.getItem("nh_user");
      if (!raw) {
        return { name: "Recruiter", initials: "R" };
      }
      const parsed = raw.startsWith("{") ? JSON.parse(raw) : { email: raw };
      const name =
        parsed?.name ||
        parsed?.fullName ||
        parsed?.email?.split("@")?.[0] ||
        "Recruiter";
      const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "R";
      return { name, initials };
    } catch (e) {
      return { name: "Recruiter", initials: "R" };
    }
  }, [user]);

  // Renders the active content page inside the workspace shell.
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
      case "jobs":
        return (
          <JobsPage
            setCurrentPage={setCurrentPage}
            setJobDescription={setJobDescription}
            setFiles={setFiles}
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
        return (
          <DashboardPage
            files={files}
            jobDescription={jobDescription}
            setSelectedResume={setSelectedResume}
            setCurrentPage={setCurrentPage}
          />
        );

      case "interview":
        return (
          <InterviewPage
            jobDescription={jobDescription}
            resumeText={selectedResume?.rawText || ""}
            candidateName={
              selectedResume?.insights?.contact?.name ||
              selectedResume?.name ||
              "Candidate"
            }
            candidateId={selectedResume?.candidateId}
            onExit={() => setCurrentPage("dashboard")}
          />
        );

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

  // Renders one sidebar navigation item.
  const SidebarItem = ({ page, label, icon: Icon }) => {
    const isActive = currentPage === page || (page === "dashboard" && currentPage === "interview");
    const activeClass = "workspace-nav-item-active";
    const inactiveClass = "workspace-nav-item-inactive";

    return (
      <button
        onClick={() => {
          setCurrentPage(page);
          setMobileMenuOpen(false);
        }}
        className={`workspace-nav-item ${isActive ? activeClass : inactiveClass}`}
      >
        <Icon size={18} /> <span>{label}</span>
      </button>
    );
  };

  // AUTH ROUTING
  if (!user) {
    if (authPage === "login") {
      return (
        <>
          <LoginPage
            setUser={setUser}
            setPage={setAuthPage}
            showAlert={showAlert}
          />
          <AlertPopup
            open={popup.open}
            type={popup.type}
            title={popup.title}
            message={popup.message}
            onClose={closePopup}
          />
        </>
      );
    }

    return (
      <>
        <RegisterPage setPage={setAuthPage} showAlert={showAlert} />
        <AlertPopup
          open={popup.open}
          type={popup.type}
          title={popup.title}
          message={popup.message}
          onClose={closePopup}
        />
      </>
    );
  }
  return (
    <>
      <div className="workspace-shell">
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close menu overlay"
            className="workspace-mobile-backdrop"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside className={`workspace-sidebar ${mobileMenuOpen ? "workspace-sidebar-open" : ""}`}>
          <div className="workspace-brand">
            <div className="workspace-brand-mark">N</div>
            <h1 className="workspace-brand-title">NextHire AI</h1>
            <button
              type="button"
              className="workspace-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="workspace-nav">
            <SidebarItem page="jobs" label="Job Roles" icon={LayoutList} />
            <SidebarItem page="job" label="Define Job" icon={FileText} />
            <SidebarItem page="cvs" label="Parse Resumes" icon={Upload} />
            <SidebarItem page="dashboard" label="Dashboard" icon={LayoutList} />
          </nav>

          <div className="workspace-sidebar-foot">
            <div className="workspace-user-chip">
              <span className="workspace-user-avatar">{sidebarUser.initials}</span>
              <span className="workspace-user-name">{sidebarUser.name}</span>
            </div>
            <Button
              variant="secondary"
              className="workspace-side-btn"
              icon={House}
              onClick={() => setConfirmHomeOpen(true)}
            >
              Home
            </Button>
            <Button
              variant="danger"
              className="workspace-side-btn"
              icon={LogOut}
              onClick={() => setConfirmLogoutOpen(true)}
            >
              Logout
            </Button>
          </div>
        </aside>

        <div className="workspace-main">
          <header className="workspace-topbar">
            <div className="workspace-topbar-left">
              <button
                type="button"
                className="workspace-menu-btn"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
              <span className="workspace-mobile-title">NextHire AI</span>
              <h2 className="workspace-page-title">
                {currentPage === "job" && "Define Job"}
                {currentPage === "jobs" && "Job Roles"}
                {currentPage === "cvs" && "Upload Resumes"}
                {currentPage === "dashboard" && "Candidates"}
                {currentPage === "interview" && "Interview Assistant"}
              </h2>
            </div>

            <div className="workspace-topbar-actions">
              <Button
                variant="primary"
                className="workspace-action-btn"
                onClick={() => {
                  setJobDescription({ title: "", description: "" });
                  setFiles([]);
                  setCurrentPage("job");
                }}
              >
                + Create Job
              </Button>
            </div>
          </header>

          <main className="workspace-content">{renderPage}</main>
        </div>
      </div>
      <AlertPopup
        open={popup.open}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={closePopup}
      />
      <ConfirmDialog
        open={confirmHomeOpen}
        title="Go Home?"
        message="Going to Home will log you out. You will need to login again."
        confirmText="Go Home"
        cancelText="Cancel"
        onCancel={() => setConfirmHomeOpen(false)}
        onConfirm={() => {
          setConfirmHomeOpen(false);
          goHomeAndLogout();
        }}
      />
      <ConfirmDialog
        open={confirmLogoutOpen}
        title="Logout?"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        danger
        onCancel={() => setConfirmLogoutOpen(false)}
        onConfirm={() => {
          setConfirmLogoutOpen(false);
          logout();
        }}
      />
    </>
  );
};

export default App;









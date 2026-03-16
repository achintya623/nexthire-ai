# ============================================================
# question_library.py
# Centralized interview questions + evaluation signals
# ============================================================

QUESTION_LIBRARY = {

    # --------------------------------------------------------
    # Core fundamentals (any role)
    # --------------------------------------------------------
    "core_fundamentals": [
        {
            "question": "Explain a core concept you use frequently in your role and why it matters.",
            "strong_signal": "Explains concept clearly, gives real example, mentions trade-offs.",
            "weak_signal": "Gives vague definition or memorized explanation with no context.",
            "follow_up": {
                "if_strong": {
                    "question": "How have you applied that concept in a complex real-world scenario?",
                    "purpose": "Validate depth beyond textbook understanding."
                },
                "if_weak": {
                    "question": "Can you walk me through a specific example where you used it?",
                    "purpose": "Force concrete evidence of usage."
                }
            }
        },
        {
            "question": "Describe a problem you recently solved and how you approached it.",
            "strong_signal": "Structured thinking, constraints considered, outcome explained.",
            "weak_signal": "Jumps straight to solution without reasoning.",
            "follow_up": {
                "if_strong": {
                    "question": "What trade-offs did you evaluate before choosing that solution?",
                    "purpose": "Assess decision quality."
                },
                "if_weak": {
                    "question": "What constraints did you identify before acting?",
                    "purpose": "Test structured thinking."
                }
            }
        }
    ],

    # --------------------------------------------------------
    # Missing required skills
    # --------------------------------------------------------
    "missing_required_skills": [
        {
            "question": "This role requires {skill}. Can you explain your familiarity with it?",
            "strong_signal": "Admits limits honestly OR demonstrates working knowledge.",
            "weak_signal": "Overclaims experience or avoids answering directly.",
            "follow_up": {
                "if_strong": {
                    "question": "Can you describe a real project where you used {skill}?",
                    "purpose": "Validate claimed expertise."
                },
                "if_weak": {
                    "question": "How would you ramp up quickly in {skill}?",
                    "purpose": "Evaluate learning strategy."
                }
            }
        },
        {
            "question": "How would you get productive with {skill} in the first few weeks?",
            "strong_signal": "Mentions learning plan, documentation, real-world practice.",
            "weak_signal": "Gives generic answer like 'I will learn it quickly'.",
            "follow_up": {
                "if_strong": {
                    "question": "What resources would you prioritize first?",
                    "purpose": "Assess structured learning."
                },
                "if_weak": {
                    "question": "What steps would you take in week one specifically?",
                    "purpose": "Force actionable thinking."
                }
            }
        }
    ],

    # --------------------------------------------------------
    # Architecture & decisions
    # --------------------------------------------------------
    "architecture_and_decisions": [
        {
            "question": "Describe an architectural decision you made and the trade-offs involved.",
            "strong_signal": "Mentions scalability, maintainability, constraints.",
            "weak_signal": "Focuses only on tools, not decisions.",
            "follow_up": {
                "if_strong": {
                    "question": "How did that decision impact long-term scalability?",
                    "purpose": "Probe strategic architectural thinking."
                },
                "if_weak": {
                    "question": "What alternatives did you evaluate before deciding?",
                    "purpose": "Expose surface-level understanding."
                }
            }
        },
        {
            "question": "Have you ever refactored or redesigned a system? Why?",
            "strong_signal": "Clear reasoning, impact on performance or team velocity.",
            "weak_signal": "No concrete example.",
            "follow_up": {
                "if_strong": {
                    "question": "What measurable improvements resulted from that refactor?",
                    "purpose": "Check outcome awareness."
                },
                "if_weak": {
                    "question": "What signals indicated the system needed redesign?",
                    "purpose": "Test detection of technical debt."
                }
            }
        }
    ],

    # --------------------------------------------------------
    # Experience validation
    # --------------------------------------------------------
    "experience_validation": [
        {
            "question": "What challenges did you face at your current experience level?",
            "strong_signal": "Shows growth, learning, awareness of limitations.",
            "weak_signal": "Claims no challenges or blames others.",
            "follow_up": {
                "if_strong": {
                    "question": "How did you overcome those challenges?",
                    "purpose": "Validate growth maturity."
                },
                "if_weak": {
                    "question": "Can you recall a specific technical challenge you struggled with?",
                    "purpose": "Encourage self-awareness."
                }
            }
        },
        {
            "question": "How has your responsibility changed over time?",
            "strong_signal": "Mentions ownership, mentorship, complexity.",
            "weak_signal": "Responsibilities sound unchanged.",
            "follow_up": {
                "if_strong": {
                    "question": "Have you led any technical initiatives?",
                    "purpose": "Validate senior signals."
                },
                "if_weak": {
                    "question": "What responsibility are you aiming to take next?",
                    "purpose": "Assess ambition."
                }
            }
        }
    ],

    # --------------------------------------------------------
    # Role clarity
    # --------------------------------------------------------
    "role_clarity": [
        {
            "question": "How would you describe your primary role in past teams?",
            "strong_signal": "Clear role definition aligned with JD.",
            "weak_signal": "Role sounds unrelated or inconsistent.",
            "follow_up": {
                "if_strong": {
                    "question": "How did your role contribute to team outcomes?",
                    "purpose": "Evaluate impact clarity."
                },
                "if_weak": {
                    "question": "Can you clarify what your main responsibility was?",
                    "purpose": "Resolve ambiguity."
                }
            }
        }
    ],

    # --------------------------------------------------------
    # System design (light – senior only)
    # --------------------------------------------------------
    "system_design_light": [
        {
            "question": "How would you design a simple system for this role’s main responsibility?",
            "strong_signal": "Breaks problem into components, mentions trade-offs.",
            "weak_signal": "Jumps straight to tools or buzzwords.",
            "follow_up": {
                "if_strong": {
                    "question": "How would your design change at 10x scale?",
                    "purpose": "Test scalability depth."
                },
                "if_weak": {
                    "question": "What components would you define before choosing tools?",
                    "purpose": "Force structured reasoning."
                }
            }
        }
    ],

    # --------------------------------------------------------
    # General problem solving (fallback)
    # --------------------------------------------------------
    "general_problem_solving": [
        {
            "question": "Walk me through how you solve an unfamiliar problem.",
            "strong_signal": "Clarifies requirements, explores options, validates solution.",
            "weak_signal": "Starts coding immediately without analysis.",
            "follow_up": {
                "if_strong": {
                    "question": "How do you validate your solution assumptions?",
                    "purpose": "Assess verification habits."
                },
                "if_weak": {
                    "question": "What steps would you take before implementing a solution?",
                    "purpose": "Re-anchor toward process."
                }
            }
        }
    ]
}

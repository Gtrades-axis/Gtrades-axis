export const ALL_MODULES = [
  {
    id: "mod_1",
    title: "Module 1 — Introduction",
    description: "Welcome, academy overview, rules, environment setup, recommended tools.",
    lessons: [
      { id: "lsn_1_1", title: "Welcome to GTRADES-AXIS™", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_1_2", title: "How the Academy Works", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_1_3", title: "Trading Rules & Expectations", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_1_4", title: "Setting Up Your Trading Environment", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_1_5", title: "Recommended Tools", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    hasQuiz: true,
    quiz: { passingScore: 70, questions: [
      { question: "What is the first step in the GTRADES-AXIS™ framework?", options: ["Market Structure", "Liquidity Analysis", "Risk Management", "Psychology"], correct: 0 },
      { question: "Which tool is recommended for chart analysis?", options: ["TradingView", "MetaTrader", "NinjaTrader", "All of the above"], correct: 3 },
      { question: "What is the primary rule of trading?", options: ["Protect your capital", "Make maximum profit", "Trade every day", "Use high leverage"], correct: 0 }
    ]}
  },
  {
    id: "mod_2",
    title: "Module 2 — Market Structure",
    description: "HTF bias, MTF analysis, BOS, CHOCH, internal/external structure, examples.",
    lessons: [
      { id: "lsn_2_1", title: "Understanding Market Structure", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_2", title: "Higher Timeframe (HTF) Bias", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_3", title: "Multi-Timeframe (MTF) Analysis", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_4", title: "Trend Continuation", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_5", title: "Trend Reversal", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_6", title: "Internal Structure", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_7", title: "External Structure", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_8", title: "BOS & CHoCH", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_2_9", title: "Practical Chart Examples", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    hasQuiz: true,
    quiz: { passingScore: 70, questions: [
      { question: "What does BOS stand for?", options: ["Break of Structure", "Balance of Supply", "Buy on Sight", "Breach of Support"], correct: 0 },
      { question: "Which is a sign of trend reversal?", options: ["BOS", "CHoCH", "Liquidity Sweep", "All of the above"], correct: 1 },
      { question: "What is the HTF bias used for?", options: ["Determining overall trend direction", "Entry timing", "Risk management", "Setting stop loss"], correct: 0 }
    ]}
  },
  {
    id: "mod_3",
    title: "Module 3 — Liquidity",
    description: "Equal highs/lows, sweeps, inducement, engineered liquidity, mapping.",
    lessons: [
      { id: "lsn_3_1", title: "Introduction to Liquidity", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_2", title: "Equal Highs", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_3", title: "Equal Lows", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_4", title: "Liquidity Sweeps", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_5", title: "Inducement", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_6", title: "Engineered Liquidity", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_7", title: "Liquidity Mapping", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_3_8", title: "Practical Examples", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    hasQuiz: true,
    quiz: { passingScore: 70, questions: [
      { question: "What is a liquidity sweep?", options: ["Price moves past a swing high/low to grab orders", "Price bounces off support", "Price trends strongly", "Price consolidates"], correct: 0 },
      { question: "Equal highs and equal lows indicate:", options: ["Liquidity zones", "Support and resistance", "Trend continuation", "Breakout"], correct: 0 },
      { question: "Engineered liquidity is:", options: ["Created by institutions to trap traders", "Natural market movement", "Always bullish", "Always bearish"], correct: 0 }
    ]}
  },
  {
    id: "mod_4",
    title: "Module 4 — Supply & Demand",
    description: "Institutional zones, fresh vs tested, refinement, premium/discount, combining with structure.",
    lessons: [
      { id: "lsn_4_1", title: "Institutional Supply", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_4_2", title: "Institutional Demand", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_4_3", title: "Fresh vs Tested Zones", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_4_4", title: "Zone Refinement", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_4_5", title: "Premium & Discount", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_4_6", title: "Combining Structure with S&D", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_4_7", title: "Practical Chart Examples", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    hasQuiz: true,
    quiz: { passingScore: 70, questions: [
      { question: "What is a fresh zone?", options: ["Untested by price", "Tested multiple times", "Very wide zone", "On a lower timeframe"], correct: 0 },
      { question: "Supply zones are typically found:", options: ["Near resistance levels", "Near support levels", "In the middle of a range", "Below price"], correct: 0 },
      { question: "Demand zones are typically found:", options: ["Near support levels", "Near resistance levels", "In the middle of a range", "Above price"], correct: 0 }
    ]}
  },
  {
    id: "mod_5",
    title: "Module 5 — Trade Entries",
    description: "LC-1, LC-2A, LTF RE, MTF RE, confirmation checklist, trade management, exit strategy.",
    lessons: [
      { id: "lsn_5_1", title: "Entry Philosophy", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_2", title: "LC-1", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_3", title: "LC-2A", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_4", title: "Lower Timeframe Re-entry (LTF RE)", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_5", title: "Multi-Timeframe Re-entry (MTF RE)", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_6", title: "Confirmation Checklist", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_7", title: "Trade Management", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_5_8", title: "Exit Strategy", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    hasQuiz: true,
    quiz: { passingScore: 70, questions: [
      { question: "What does LC-1 stand for?", options: ["Liquidity Capture 1", "Low Confidence 1", "Long Call 1", "Limit Close 1"], correct: 0 },
      { question: "What is the main purpose of a confirmation checklist?", options: ["Avoid impulsive entries", "Increase position size", "Trade more frequently", "Use higher leverage"], correct: 0 }
    ]}
  },
  {
    id: "mod_6",
    title: "Module 6 — Risk Management",
    description: "Position sizing, risk per trade, daily/weekly limits, R:R, prop firm rules, drawdown.",
    lessons: [
      { id: "lsn_6_1", title: "Position Sizing", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_6_2", title: "Risk Per Trade", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_6_3", title: "Daily & Weekly Limits", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_6_4", title: "Risk-to-Reward", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_6_5", title: "Prop Firm Rules", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_6_6", title: "Managing Drawdown", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    hasQuiz: true,
    quiz: { passingScore: 70, questions: [
      { question: "What is a recommended risk per trade for beginners?", options: ["1-2%", "5-10%", "20%", "50%"], correct: 0 },
      { question: "What is drawdown?", options: ["Peak-to-trough decline in equity", "Maximum profit", "Average win", "Total trades"], correct: 0 }
    ]}
  },
  {
    id: "mod_7",
    title: "Module 7 — Trading Psychology",
    description: "Discipline, patience, emotional control, routine, consistency, common mistakes.",
    lessons: [
      { id: "lsn_7_1", title: "Discipline", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_7_2", title: "Patience", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_7_3", title: "Emotional Control", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_7_4", title: "Trading Routine", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_7_5", title: "Building Consistency", type: "video", videoUrl: "", pdfUrl: "", notes: "" },
      { id: "lsn_7_6", title: "Common Trading Mistakes", type: "video", videoUrl: "", pdfUrl: "", notes: "" }
    ],
    hasQuiz: true,
    quiz: { passingScore: 70, questions: [
      { question: "What is the most common mistake traders make?", options: ["Overtrading", "Using stop losses", "Following a plan", "Keeping a journal"], correct: 0 },
      { question: "How can you improve trading consistency?", options: ["Stick to your trading plan", "Trade every signal", "Increase risk", "Ignore the market"], correct: 0 }
    ]}
  }
];
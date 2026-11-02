// ============================================================
// GTRADES-AXIS™ ACADEMY – COMPLETE MODULE DATA
// With proper lesson counts matching your PDFs
// ============================================================

export const ALL_MODULES = [
  // ============================================================
  // MODULE 1 – INTRODUCTION (3 Lessons)
  // ============================================================
  {
    id: "mod_1",
    title: "Module 1 — Introduction",
    description: "Welcome to GTRADES-AXIS™ Academy. Learn the foundation, trading basics, and market mechanics.",
    order: 1,
    hasQuiz: true,
    lessons: [
      { id: "lsn_1_1", title: "Welcome, Mission & Core Values", type: "video", videoUrl: "", pdfUrl: "GTRADES-AXIS_Module_1_Introduction_Template.pdf", notes: "<h3>Welcome</h3><p>Welcome to GTRADES-AXIS™ Academy...</p>" },
      { id: "lsn_1_2", title: "Currency Pairs, Pips & Lots", type: "video", videoUrl: "", pdfUrl: "GTRADES-AXIS_Module_1_Introduction_Template.pdf", notes: "<h3>Currency Pairs</h3><p>The major currencies...</p>" },
      { id: "lsn_1_3", title: "Market Analysis & Trading Styles", type: "video", videoUrl: "", pdfUrl: "GTRADES-AXIS_Module_1_Introduction_Template.pdf", notes: "<h3>How to Analyze the Market</h3><p>Fundamental, technical, hybrid...</p>" }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What is the first step in the GTRADES-AXIS™ learning path?", options: ["Market Structure", "Introduction", "Supply & Demand", "Liquidity"], correct: 1 },
        { question: "Which of these is a major currency pair?", options: ["GBP/JPY", "EUR/USD", "EUR/GBP", "AUD/JPY"], correct: 1 },
        { question: "What is 1 pip for most currency pairs?", options: ["0.001", "0.0001", "0.01", "0.00001"], correct: 1 },
        { question: "Which tool is recommended for chart analysis at GTRADES-AXIS™?", options: ["MetaTrader 5", "TradingView", "NinjaTrader", "All of the above"], correct: 1 }
      ]
    }
  },

  // ============================================================
  // MODULE 2 – MARKET STRUCTURE (9 Lessons)
  // ============================================================
  {
    id: "mod_2",
    title: "Module 2 — Market Structure",
    description: "Learn how to identify trends, BOS, CHoCH, fractal structure, and apply multi-timeframe analysis.",
    order: 2,
    hasQuiz: true,
    lessons: [
      {
        id: "lsn_2_1",
        title: "Introduction to Market Structure",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_2_Market_Structure.pdf",
        notes: "<h3>What is Market Structure?</h3><p>Market Structure is the sequence of price swings that reveals trend direction and control between buyers and sellers.</p>"
      },
      {
        id: "lsn_2_2",
        title: "Bullish & Bearish Structure",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_2_Market_Structure.pdf",
        notes: "<h3>Bullish Structure</h3><p>Higher Highs (HH) and Higher Lows (HL). Buyers in control.</p><h3>Bearish Structure</h3><p>Lower Lows (LL) and Lower Highs (LH). Sellers in control.</p><h3>Ranging Structure</h3><p>Sideways movement between support and resistance.</p>"
      },
      {
        id: "lsn_2_3",
        title: "Swing Highs, Swing Lows & Fractals",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_2_Market_Structure.pdf",
        notes: "<h3>Swing Highs & Swing Lows</h3><p>Form the basis of structural analysis.</p><h3>Fractal Structure</h3><p>100% mechanical mapping using candle wicks.</p>"
      },
      {
        id: "lsn_2_4",
        title: "Break of Structure (BOS)",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_2_Market_Structure.pdf",
        notes: "<h3>Break of Structure (BOS)</h3><p>Confirms continuation by breaking a significant swing in the direction of the prevailing trend.</p>"
      },
      {
        id: "lsn_2_5",
        title: "Change of Character (CHoCH)",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_2_Market_Structure.pdf",
        notes: "<h3>CHoCH</h3><p>The first warning that control may be shifting from buyers to sellers or vice versa.</p><p>It's the most aggressive type of structure break.</p>"
      },
      {
        id: "lsn_2_6",
        title: "Internal vs External Structure",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_2_Market_Structure.pdf",
        notes: "<h3>Internal vs External Structure</h3><p>External defines the overall market bias. Internal refines entries.</p>"
      },
      {
        id: "lsn_2_7",
        title: "Fractal Rules & Inside Bars",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_2_Market_Structure.pdf",
        notes: "<h3>Fractal Rules</h3><ul><li>Bullish: map the NEAREST Fractal low</li><li>Bearish: map the NEAREST Fractal high</li></ul><h3>Inside Bars</h3><p>A candle that fails to break the previous candle's high and low.</p>"
      },
      {
        id: "lsn_2_8",
        title: "Multi-Timeframe (MTF) Analysis",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_2_Market_Structure.pdf",
        notes: "<h3>MTF Analysis</h3><p>HTF = narrative, MTF = immediate bias, LTF = execution.</p><p>Example: HTF 4H → MTF 15M → LTF 1M</p>"
      },
      {
        id: "lsn_2_9",
        title: "Common Mistakes & Structure Mapping",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_2_Market_Structure.pdf",
        notes: "<h3>Common Mistakes</h3><ul><li>Trading against trend</li><li>Ignoring higher timeframes</li><li>Equal highs/lows confusion</li><li>Focusing on candle colour</li></ul>"
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What does BOS stand for?", options: ["Break of Structure", "Balance of Supply", "Buy on Sight", "Breach of Support"], correct: 0 },
        { question: "Which is a sign of trend reversal?", options: ["BOS", "CHoCH", "Liquidity Sweep", "All of the above"], correct: 1 },
        { question: "What is the HTF bias used for?", options: ["Determining overall trend direction", "Entry timing", "Risk management", "Setting stop loss"], correct: 0 },
        { question: "What timeframe combination is recommended for execution?", options: ["4H → D → W", "D → 4H → 15M", "15M → 1H → 4H", "M1 → M5 → M15"], correct: 1 },
        { question: "What does CHoCH indicate?", options: ["Continuation of trend", "Potential trend reversal", "Strong momentum", "Support level"], correct: 1 }
      ]
    }
  },

  // ============================================================
  // MODULE 3 – SUPPLY & DEMAND (3 Lessons)
  // ============================================================
  {
    id: "mod_3",
    title: "Module 3 — Supply & Demand",
    description: "Master institutional supply and demand zones, zone refinement, and combining with market structure.",
    order: 3,
    hasQuiz: true,
    lessons: [
      {
        id: "lsn_3_1",
        title: "Supply & Demand Fundamentals & Order Flow",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_3_Supply_and_Demand.pdf",
        notes: "<h3>Introduction</h3><p>Supply and Demand zones are areas where institutions leave footprints...</p>"
      },
      {
        id: "lsn_3_2",
        title: "Identifying Quality Zones & Refinement",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_3_Supply_and_Demand.pdf",
        notes: "<h3>How to Identify Quality Zones</h3><p>Look for explosive moves, strong momentum candles...</p>"
      },
      {
        id: "lsn_3_3",
        title: "Combining with Structure & Checklist",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_3_Supply_and_Demand.pdf",
        notes: "<h3>Combining with Market Structure</h3><p>Always trade demand in bullish structure and supply in bearish structure.</p>"
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What is a fresh zone?", options: ["Untested by price", "Tested multiple times", "Very wide zone", "On a lower timeframe"], correct: 0 },
        { question: "Supply zones are typically found:", options: ["Near resistance levels", "Near support levels", "In the middle of a range", "Below price"], correct: 0 },
        { question: "Demand zones are typically found:", options: ["Near support levels", "Near resistance levels", "In the middle of a range", "Above price"], correct: 0 },
        { question: "What is a demand reversal?", options: ["Price is bullish before", "Price is bearish before", "Price is ranging", "Price is consolidating"], correct: 1 }
      ]
    }
  },

  // ============================================================
  // MODULE 4 – LIQUIDITY (2 Lessons)
  // ============================================================
  {
    id: "mod_4",
    title: "Module 4 — Liquidity",
    description: "Understand buy-side and sell-side liquidity, liquidity sweeps, inducement, and combining with structure.",
    order: 4,
    hasQuiz: true,
    lessons: [
      {
        id: "lsn_4_1",
        title: "Liquidity Fundamentals & Types",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_4_Liquidity.pdf",
        notes: "<h3>What is Liquidity?</h3><p>Price is continuously seeking pools of liquidity to rebalance the market.</p>"
      },
      {
        id: "lsn_4_2",
        title: "Liquidity Sweeps, Inducement & Strategy",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_4_Liquidity.pdf",
        notes: "<h3>Liquidity Sweep</h3><p>Price briefly moves through a liquidity pool, triggering stop orders before reversing.</p>"
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What is a liquidity sweep?", options: ["Price moves past a swing high/low to grab orders", "Price bounces off support", "Price trends strongly", "Price consolidates"], correct: 0 },
        { question: "Equal highs and equal lows indicate:", options: ["Liquidity zones", "Support and resistance", "Trend continuation", "Breakout"], correct: 0 },
        { question: "Engineered liquidity is:", options: ["Created by institutions to trap traders", "Natural market movement", "Always bullish", "Always bearish"], correct: 0 },
        { question: "What is inducement?", options: ["A move to encourage traders into positions before reversal", "A strong trend continuation", "A support level", "A resistance level"], correct: 0 }
      ]
    }
  },

  // ============================================================
  // MODULE 5 – TRADE ENTRIES (2 Lessons)
  // ============================================================
  {
    id: "mod_5",
    title: "Module 5 — Trade Entries",
    description: "LC-1, LC-2A, LTF RE, MTF RE, confirmation checklist, trade management, exit strategy.",
    order: 5,
    hasQuiz: true,
    lessons: [
      {
        id: "lsn_5_1",
        title: "Entry Models (LC-1, LC-2A, LTF RE, MTF RE)",
        type: "video",
        videoUrl: "",
        pdfUrl: "",
        notes: "<h3>Entry Philosophy</h3><p>Every trade must have a clear reason for entry...</p>"
      },
      {
        id: "lsn_5_2",
        title: "Confirmation Checklist & Trade Management",
        type: "video",
        videoUrl: "",
        pdfUrl: "",
        notes: "<h3>Confirmation Checklist</h3><ul><li>✔ HTF bias confirmed</li><li>✔ Structure aligned</li>..."
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What does LC-1 stand for?", options: ["Liquidity Capture 1", "Low Confidence 1", "Long Call 1", "Limit Close 1"], correct: 0 },
        { question: "What is the main purpose of a confirmation checklist?", options: ["Avoid impulsive entries", "Increase position size", "Trade more frequently", "Use higher leverage"], correct: 0 },
        { question: "What is LTF RE?", options: ["Lower Timeframe Re-entry", "Long Term Fibonacci Retracement", "Limit Trade Framework", "Liquidity Trend Reversal"], correct: 0 },
        { question: "What is a recommended minimum risk-to-reward ratio?", options: ["1:1", "2:1", "5:1", "10:1"], correct: 1 }
      ]
    }
  },

  // ============================================================
  // MODULE 6 – RISK MANAGEMENT (2 Lessons)
  // ============================================================
  {
    id: "mod_6",
    title: "Module 6 — Risk Management",
    description: "Position sizing, risk per trade, daily/weekly limits, R:R, prop firm rules, drawdown.",
    order: 6,
    hasQuiz: true,
    lessons: [
      {
        id: "lsn_6_1",
        title: "Risk Fundamentals (Position Sizing, Risk Per Trade)",
        type: "video",
        videoUrl: "",
        pdfUrl: "",
        notes: "<h3>Position Sizing</h3><p>Calculate position size based on account risk percentage and stop loss distance.</p>"
      },
      {
        id: "lsn_6_2",
        title: "Advanced Risk Management (R:R, Drawdown, Prop Firm Rules)",
        type: "video",
        videoUrl: "",
        pdfUrl: "",
        notes: "<h3>Risk-to-Reward (R:R)</h3><p>Minimum target: 2:1 R:R.</p>"
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What is a recommended risk per trade for beginners?", options: ["1-2%", "5-10%", "20%", "50%"], correct: 0 },
        { question: "What is drawdown?", options: ["Peak-to-trough decline in equity", "Maximum profit", "Average win", "Total trades"], correct: 0 },
        { question: "What is the golden rule of trading?", options: ["Preserve your capital", "Make maximum profit", "Trade every day", "Use high leverage"], correct: 0 },
        { question: "What is a recommended daily loss limit?", options: ["1%", "3%", "10%", "20%"], correct: 1 }
      ]
    }
  },

  // ============================================================
  // MODULE 7 – TRADING PSYCHOLOGY (2 Lessons)
  // ============================================================
  {
    id: "mod_7",
    title: "Module 7 — Trading Psychology",
    description: "Discipline, patience, emotional control, routine, consistency, common mistakes.",
    order: 7,
    hasQuiz: true,
    lessons: [
      {
        id: "lsn_7_1",
        title: "Psychology Fundamentals (Discipline, Patience, Emotional Control)",
        type: "video",
        videoUrl: "",
        pdfUrl: "",
        notes: "<h3>Discipline</h3><p>Discipline is the ability to follow your trading plan even when emotions are high.</p>"
      },
      {
        id: "lsn_7_2",
        title: "Building Consistency & Common Mistakes",
        type: "video",
        videoUrl: "",
        pdfUrl: "",
        notes: "<h3>Trading Routine</h3><p>A consistent routine builds consistency in trading.</p>"
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        { question: "What is the most common mistake traders make?", options: ["Overtrading", "Using stop losses", "Following a plan", "Keeping a journal"], correct: 0 },
        { question: "How can you improve trading consistency?", options: ["Stick to your trading plan", "Trade every signal", "Increase risk", "Ignore the market"], correct: 0 },
        { question: "What emotion leads to holding losing trades?", options: ["Hope", "Fear", "Greed", "Overconfidence"], correct: 0 },
        { question: "What is the key to consistency?", options: ["Following your trading plan", "Making more money", "Trading more often", "Using higher leverage"], correct: 0 }
      ]
    }
  }
];
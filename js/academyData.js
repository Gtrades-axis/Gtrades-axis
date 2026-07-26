// ============================================================
// GTRADES-AXIS™ ACADEMY – COMPLETE MODULE DATA
// With real content from Modules 1-4
// ============================================================

export const ALL_MODULES = [
  // ============================================================
  // MODULE 1 – INTRODUCTION
  // ============================================================
  {
    id: "mod_1",
    title: "Module 1 — Introduction",
    description: "Welcome to GTRADES-AXIS™ Academy. Learn the foundation, trading basics, and market mechanics.",
    order: 1,
    hasQuiz: true,
    lessons: [
      {
        id: "lsn_1_1",
        title: "Welcome & Mission",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_1_Introduction_Template.pdf",
        notes: `
<h3>Welcome</h3>
<p>Welcome to GTRADES-AXIS™ Academy. This course is designed to guide traders through one complete trading framework from market understanding to disciplined execution. The focus is on developing consistent habits rather than chasing quick profits.</p>

<h3>Mission</h3>
<p>To empower traders through structured education, disciplined execution and professional risk management.</p>

<h3>Vision</h3>
<p>To build a respected global trading community recognized for consistency, integrity and continuous learning.</p>

<h3>Core Values</h3>
<ul>
  <li>Discipline</li>
  <li>Consistency</li>
  <li>Patience</li>
  <li>Accountability</li>
  <li>Continuous Learning</li>
  <li>Professionalism</li>
</ul>

<h3>Learning Path</h3>
<ol>
  <li>Introduction</li>
  <li>Market Structure</li>
  <li>Supply & Demand</li>
  <li>Liquidity</li>
  <li>Entries</li>
  <li>Trade Management</li>
  <li>Psychology</li>
</ol>

<h3>How to Use This Course</h3>
<p>Study each module in sequence. Take notes, practice on charts, journal your trades and avoid skipping lessons.</p>

<h3>Required Tools</h3>
<ul>
  <li>TradingView</li>
  <li>MetaTrader 5</li>
  <li>Trading Journal</li>
  <li>Economic Calendar</li>
  <li>Reliable Internet</li>
</ul>

<h3>Key Takeaway</h3>
<p><strong>TRADING IS NOT ABOUT GETTING RICH OVERNIGHT.</strong></p>
<p>It is about developing a skill that can generate consistent results through discipline, patience, and structured execution. At GTRADES-AXIS™, we don't chase the market. We trade with structure. Execute with precision.</p>
`
      },
      {
        id: "lsn_1_2",
        title: "Currency Pairs & Market Basics",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_1_Introduction_Template.pdf",
        notes: `
<h3>The Major Currencies</h3>
<p>As a beginner, you do not need to trade every currency in the market. We recommend focusing on the 8 major currencies, as they have the highest trading volume, deepest liquidity, and generally the lowest transaction costs.</p>

<h3>Major Pairs</h3>
<p>Major pairs always contain the US Dollar (USD).</p>
<ul>
  <li>EUR/USD</li>
  <li>GBP/USD</li>
  <li>AUD/USD</li>
  <li>USD/JPY</li>
  <li>USD/CAD</li>
  <li>USD/CHF</li>
  <li>NZD/USD</li>
</ul>

<h3>Our Primary Focus</h3>
<p>At GTRADES-AXIS™, we encourage mastery over quantity. Our primary trading pairs are:</p>
<ul>
  <li>EUR/USD (EU)</li>
  <li>GBP/USD (GU)</li>
  <li>XAU/USD (GJ)</li>
  <li>USD/JPY (UJ)</li>
</ul>
<p>Mastering a few pairs is far more effective than constantly switching between many markets.</p>

<h3>What is a Pip?</h3>
<p>1 pip = 0.0001 (for most pairs)</p>
<p>Example: EUR/USD moves from 1.1200 to 1.1201 = 1 pip.</p>
<p>For JPY pairs: 1 Pip = 0.01</p>

<h3>What is a Lot?</h3>
<ul>
  <li>Standard Lot = 100,000 units</li>
  <li>Mini Lot = 10,000 units</li>
  <li>Micro Lot = 1,000 units</li>
</ul>

<h3>What is Leverage?</h3>
<p>Leverage allows traders to control larger positions using a smaller amount of capital. Leverage increases buying power—but it does not improve your trading strategy.</p>

<h3>Understanding Market Mechanics</h3>
<p>Every movement in the Forex market is driven by Supply and Demand. When buying pressure exceeds selling pressure, prices rise. When selling pressure exceeds buying pressure, prices fall.</p>
`
      },
      {
        id: "lsn_1_3",
        title: "Market Analysis & Trading Styles",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_1_Introduction_Template.pdf",
        notes: `
<h3>How to Analyze the Market</h3>
<p>Successful traders analyze the market before placing trades. There are three common approaches.</p>

<h4>1. Fundamental Analysis</h4>
<p>Studies the economic strength of countries. Currencies often gain or lose value because of economic events such as:</p>
<ul>
  <li>Interest rates</li>
  <li>Inflation</li>
  <li>Employment data</li>
  <li>GDP growth</li>
  <li>Central bank decisions</li>
  <li>Retail sales</li>
  <li>Manufacturing reports</li>
</ul>

<h4>2. Technical Analysis</h4>
<p>Studies price movement on charts. At GTRADES-AXIS™, technical analysis focuses on:</p>
<ul>
  <li>Market Structure</li>
  <li>Supply & Demand</li>
  <li>Liquidity</li>
  <li>Price Action</li>
  <li>High-Probability Entries</li>
  <li>Risk Management</li>
</ul>

<h4>3. Hybrid Analysis</h4>
<p>Many professional traders combine both approaches. They use fundamentals to understand the broader market environment and technical analysis to identify precise trade entries.</p>

<h3>Trading Styles</h3>
<ul>
  <li><strong>Scalping:</strong> Holding trades for seconds or minutes.</li>
  <li><strong>Day Trading:</strong> Opening and closing trades within the same trading day.</li>
  <li><strong>Swing Trading:</strong> Holding positions for several days or weeks.</li>
  <li><strong>Position Trading:</strong> Holding trades for months based on long-term trends.</li>
</ul>

<h3>Key Takeaway</h3>
<p>The market does not reward those who trade the most. It rewards those who consistently execute a proven strategy with discipline, patience, and effective risk management.</p>
<p><strong>Trade with Structure. Execute with Precision.</strong></p>
`
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        {
          question: "What is the first step in the GTRADES-AXIS™ learning path?",
          options: ["Market Structure", "Introduction", "Supply & Demand", "Liquidity"],
          correct: 1
        },
        {
          question: "Which of these is a major currency pair?",
          options: ["GBP/JPY", "EUR/USD", "EUR/GBP", "AUD/JPY"],
          correct: 1
        },
        {
          question: "What is 1 pip for most currency pairs?",
          options: ["0.001", "0.0001", "0.01", "0.00001"],
          correct: 1
        },
        {
          question: "Which tool is recommended for chart analysis at GTRADES-AXIS™?",
          options: ["MetaTrader 5", "TradingView", "NinjaTrader", "All of the above"],
          correct: 1
        }
      ]
    }
  },

  // ============================================================
  // MODULE 2 – MARKET STRUCTURE
  // ============================================================
  {
    id: "mod_2",
    title: "Module 2 — Market Structure",
    description: "Learn how to identify trends, BOS, CHoCH, and apply multi-timeframe analysis.",
    order: 2,
    hasQuiz: true,
    lessons: [
      {
        id: "lsn_2_1",
        title: "Understanding Market Structure",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_2_Market_Structure.pdf",
        notes: `
<h3>What is Market Structure?</h3>
<p>Market Structure is the sequence of price swings that reveals trend direction and control between buyers and sellers.</p>

<h3>Why Market Structure Matters</h3>
<p>It provides context, improves trade quality, filters poor setups and aligns traders with the dominant market direction.</p>

<h3>Bullish Structure</h3>
<p>A bullish trend forms Higher Highs (HH) and Higher Lows (HL). Buyers remain in control and buying opportunities have higher probability.</p>

<h3>Bearish Structure</h3>
<p>A bearish trend forms Lower Lows (LL) and Lower Highs (LH). Sellers remain in control and selling opportunities have higher probability.</p>

<h3>Ranging Structure</h3>
<p>Price moves sideways between support and resistance. Wait for confirmation before committing capital.</p>

<h3>Swing Highs & Swing Lows</h3>
<p>Swing highs mark temporary peaks; swing lows mark temporary bottoms. They form the basis of structural analysis.</p>
`
      },
      {
        id: "lsn_2_2",
        title: "BOS, CHoCH & Fractal Structure",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_2_Market_Structure.pdf",
        notes: `
<h3>Break of Structure (BOS)</h3>
<p>A BOS confirms continuation by breaking a significant swing in the direction of the prevailing trend. After a BOS, expect a pullback on that timeframe.</p>

<h3>Change of Character (CHoCH)</h3>
<p>A CHoCH is the first warning that control may be shifting from buyers to sellers or vice versa. It's the most aggressive type of structure break.</p>

<h3>Fractal Structure Mapping</h3>
<p>Fractal structure is 100% mechanical. It's the most aggressive type of structure mapping as we are essentially viewing a lower timeframe trend on the current timeframe.</p>

<h4>Bullish Fractal Structure:</h4>
<p>A Fractal high is confirmed when the immediate following candle fails to break its high. A Fractal higher low is confirmed once price successfully breaks the identified Fractal high.</p>

<h4>Bearish Fractal Structure:</h4>
<p>A Fractal low is confirmed when the immediate following candle fails to break its low. A Fractal lower high is confirmed once price successfully breaks the identified Fractal low.</p>

<h3>Internal vs External Structure</h3>
<p>Internal structure refines entries. External structure defines the overall market trend and bias.</p>

<h3>Common Mistakes</h3>
<ul>
  <li>Trading against trend</li>
  <li>Ignoring higher timeframes</li>
  <li>Forcing entries</li>
  <li>Confusing pullbacks with reversals</li>
  <li>Equal highs/lows confusion</li>
  <li>Focusing on candle colour</li>
</ul>
`
      },
      {
        id: "lsn_2_3",
        title: "Multi-Timeframe Analysis",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_2_Market_Structure.pdf",
        notes: `
<h3>Multi-Timeframe (MTF) Analysis</h3>
<p>Analysing multiple timeframes together. Price is fractal. A run on a higher timeframe is a trend on a lower timeframe.</p>

<h3>MTF Structure</h3>
<p>LTF price action forms → HTF price action, which forecasts → HTF runs, which are made up of → LTF price action.</p>
<p>What happens on the HTF, must first happen on the LTF.</p>

<h3>Timeframe Roles</h3>
<ul>
  <li><strong>HTF → Narrative:</strong> Are we trading a continuation or pullback?</li>
  <li><strong>MTF → Immediate Bias:</strong> Confirms when HTF continuation is ending & pullback is starting.</li>
  <li><strong>LTF → Execution:</strong> Confirms MTF turning points.</li>
</ul>

<h3>Example Timeframe Combinations</h3>
<ul>
  <li>HTF = 4H / MTF = M15 / LTF = M1</li>
  <li>HTF = D / MTF = 4H / LTF = M15</li>
</ul>

<h3>Key Principle</h3>
<p>Know the HTF narrative, actively monitor the LTF price action, allow the trade setup to present itself.</p>
<p>Our mission is to observe how price develops around points of interest (POIs) and listen to what the market communicates to us with a neutral mindset.</p>
`
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        {
          question: "What does BOS stand for?",
          options: ["Break of Structure", "Balance of Supply", "Buy on Sight", "Breach of Support"],
          correct: 0
        },
        {
          question: "Which is a sign of trend reversal?",
          options: ["BOS", "CHoCH", "Liquidity Sweep", "All of the above"],
          correct: 1
        },
        {
          question: "What is the HTF bias used for?",
          options: ["Determining overall trend direction", "Entry timing", "Risk management", "Setting stop loss"],
          correct: 0
        },
        {
          question: "What timeframe combination is recommended for execution?",
          options: ["4H → D → W", "D → 4H → 15M", "15M → 1H → 4H", "M1 → M5 → M15"],
          correct: 1
        }
      ]
    }
  },

  // ============================================================
  // MODULE 3 – SUPPLY & DEMAND
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
        title: "Supply & Demand Fundamentals",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_3_Supply_and_Demand.pdf",
        notes: `
<h3>Introduction</h3>
<p>Supply and Demand zones are areas where institutions leave footprints through aggressive buying or selling. These zones form the foundation for high-probability trade opportunities within the GTRADES-AXIS™ Framework.</p>

<h3>What is Demand?</h3>
<p>A Demand Zone is an area where buying pressure overwhelms selling pressure, causing price to rally strongly. These zones are used to identify potential buying opportunities.</p>

<h3>What is Supply?</h3>
<p>A Supply Zone is an area where selling pressure overwhelms buying pressure, causing price to decline sharply. These zones are used to identify potential selling opportunities.</p>

<h3>Institutional Order Flow</h3>
<p>Large institutions cannot execute all orders at one price. Their activity often creates strong imbalances that leave behind supply and demand zones.</p>

<h3>Order Flow</h3>
<p>Interplay between passive & aggressive orders (interaction between buyers and sellers)</p>
<ul>
  <li><strong>Passive orders:</strong> Limit and stop orders (waiting for price to hit them)</li>
  <li><strong>Aggressive orders:</strong> 'At market' orders (instantly hit current market price)</li>
</ul>
`
      },
      {
        id: "lsn_3_2",
        title: "Identifying Quality Zones",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_3_Supply_and_Demand.pdf",
        notes: `
<h3>How to Identify Quality Zones</h3>
<p>Look for explosive moves, strong momentum candles, clear imbalance, and minimal time spent in the base.</p>

<h3>Fresh vs Tested Zones</h3>
<p>Fresh zones have never been revisited after creation and generally offer higher probability. Tested zones have been revisited and may weaken with each touch.</p>

<h3>Zone Refinement</h3>
<p>Refine zones using lower timeframes while maintaining alignment with the higher timeframe trend.</p>

<h3>Strong vs Weak Zones</h3>
<p>Strong zones produce decisive moves away from the base. Weak zones show hesitation, multiple retests or poor follow-through.</p>

<h3>S&D Continuations & Reversals</h3>
<ul>
  <li><strong>Demand continuation:</strong> Price is bullish before</li>
  <li><strong>Supply continuation:</strong> Price is bearish before</li>
  <li><strong>Demand reversal:</strong> Price is bearish before</li>
  <li><strong>Supply reversal:</strong> Price is bullish before</li>
</ul>
`
      },
      {
        id: "lsn_3_3",
        title: "Zone Refinement & Combining with Structure",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_3_Supply_and_Demand.pdf",
        notes: `
<h3>S&D Zone Refinements</h3>
<p>A range-created supply can be refined to just the pivot, the pivot candle, or even the fractal wick.</p>
<p>We look to enter on or within the zone and our stop loss will always go behind the zone.</p>
<p>More refinement of a zone leads to increased accuracy, giving you higher R:R, but potentially more missed trades if price does not pull back that far.</p>

<h3>Types of Fractal Refinements</h3>
<ul>
  <li><strong>Inside bars:</strong> Represents a range created zone on a lower timeframe</li>
  <li><strong>STB & BTS wicks:</strong> Represent a pullback on a lower timeframe</li>
  <li><strong>Large wicks:</strong> This will be a range or pivot created zone within that wick, on the lower timeframe</li>
</ul>

<h3>Combining with Market Structure</h3>
<p>Always trade demand in bullish structure and supply in bearish structure. Never trade a zone without confirming market bias.</p>

<h3>Entry Confirmation</h3>
<p>Wait for the price to react at the zone and confirm your entry model before executing.</p>

<h3>Common Mistakes</h3>
<ul>
  <li>Drawing zones everywhere</li>
  <li>Trading against structure</li>
  <li>Ignoring higher timeframes</li>
  <li>Chasing price</li>
  <li>Using over-tested zones</li>
</ul>

<h3>Supply & Demand Checklist</h3>
<ul>
  <li>✓ Trend confirmed</li>
  <li>✓ Zone identified</li>
  <li>✓ Fresh zone</li>
  <li>✓ Strong departure</li>
  <li>✓ Higher timeframe aligned</li>
  <li>✓ Entry confirmed</li>
  <li>✓ Risk defined</li>
</ul>
`
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        {
          question: "What is a fresh zone?",
          options: ["Untested by price", "Tested multiple times", "Very wide zone", "On a lower timeframe"],
          correct: 0
        },
        {
          question: "Supply zones are typically found:",
          options: ["Near resistance levels", "Near support levels", "In the middle of a range", "Below price"],
          correct: 0
        },
        {
          question: "Demand zones are typically found:",
          options: ["Near support levels", "Near resistance levels", "In the middle of a range", "Above price"],
          correct: 0
        },
        {
          question: "What is a demand reversal?",
          options: ["Price is bullish before", "Price is bearish before", "Price is ranging", "Price is consolidating"],
          correct: 1
        }
      ]
    }
  },

  // ============================================================
  // MODULE 4 – LIQUIDITY
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
        title: "Liquidity Fundamentals",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_4_Liquidity.pdf",
        notes: `
<h3>Introduction</h3>
<p>Liquidity is one of the core pillars of the GTRADES-AXIS™ Framework. Financial institutions require liquidity to execute large orders efficiently. Understanding where liquidity rests helps traders anticipate high-probability market reactions.</p>

<h3>What is Liquidity?</h3>
<ul>
  <li>The amount of demand and supply in a market</li>
  <li>The ease to which a market can be traded without affecting its price</li>
</ul>
<p>For every buy order, there must be an equivalent sell order for a trade to take place.</p>
<p>Price is continuously seeking pools of liquidity (order) to rebalance the market.</p>

<h3>Why Liquidity Matters</h3>
<p>Markets frequently seek liquidity before making significant directional moves. Identifying these areas helps traders avoid entering too early and improves trade timing.</p>

<h3>Buy-Side Liquidity</h3>
<p>Commonly found above swing highs, equal highs and resistance levels where buy stops accumulate.</p>

<h3>Sell-Side Liquidity</h3>
<p>Commonly found below swing lows, equal lows and support levels where sell stops accumulate.</p>
`
      },
      {
        id: "lsn_4_2",
        title: "Liquidity Sweeps & Inducement",
        type: "video",
        videoUrl: "",
        pdfUrl: "GTRADES-AXIS_Module_4_Liquidity.pdf",
        notes: `
<h3>Equal Highs & Equal Lows</h3>
<p>Equal highs and equal lows often become liquidity pools because many traders place stop orders around these obvious levels.</p>

<h3>Liquidity Sweep</h3>
<p>A liquidity sweep occurs when price briefly moves through a liquidity pool, triggering stop orders before reversing in the intended direction.</p>

<h3>Inducement</h3>
<p>Inducement is a move designed to encourage traders into positions before price reverses to collect their liquidity.</p>

<h3>Liquidity with Supply & Demand</h3>
<p>The highest-probability setups occur when liquidity is swept into a higher-timeframe supply or demand zone aligned with the prevailing trend.</p>

<h3>Two Main Ways We Utilise Liquidity to Refine S&D Zones:</h3>
<ol>
  <li><strong>Inducement:</strong> Leading market participants to take the other side of your trade</li>
  <li><strong>Sweep zones:</strong> Take liquidity when they are created</li>
</ol>

<h3>Liquidity & Market Structure</h3>
<p>Always analyze liquidity within the context of market structure. Liquidity alone is not an entry signal—it should support your directional bias.</p>

<h3>Structure > Liquidity</h3>
<p>Never trade liquidity alone. Always confirm with market structure and supply & demand.</p>
`
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        {
          question: "What is a liquidity sweep?",
          options: ["Price moves past a swing high/low to grab orders", "Price bounces off support", "Price trends strongly", "Price consolidates"],
          correct: 0
        },
        {
          question: "Equal highs and equal lows indicate:",
          options: ["Liquidity zones", "Support and resistance", "Trend continuation", "Breakout"],
          correct: 0
        },
        {
          question: "Engineered liquidity is:",
          options: ["Created by institutions to trap traders", "Natural market movement", "Always bullish", "Always bearish"],
          correct: 0
        },
        {
          question: "What is inducement?",
          options: ["A move to encourage traders into positions before reversal", "A strong trend continuation", "A support level", "A resistance level"],
          correct: 0
        }
      ]
    }
  },

  // ============================================================
  // MODULE 5 – TRADE ENTRIES
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
        title: "Entry Philosophy & Models",
        type: "video",
        videoUrl: "",
        pdfUrl: "",
        notes: `
<h3>Entry Philosophy</h3>
<p>Every trade must have a clear reason for entry based on the convergence of market structure, liquidity, and supply & demand.</p>

<h3>LC-1 (Liquidity Capture 1)</h3>
<p>Entry after a liquidity sweep into a supply or demand zone. Price sweeps liquidity then reverses into the zone.</p>

<h3>LC-2A (Liquidity Capture 2A)</h3>
<p>Entry after a liquidity sweep with a refined zone entry. Price sweeps liquidity, pulls back into a refined zone, then continues.</p>

<h3>LTF RE (Lower Timeframe Re-entry)</h3>
<p>Entry on a lower timeframe pullback after a break of structure on the higher timeframe.</p>

<h3>MTF RE (Multi-Timeframe Re-entry)</h3>
<p>Entry on a medium timeframe pullback after a break of structure on the higher timeframe.</p>
`
      },
      {
        id: "lsn_5_2",
        title: "Confirmation Checklist & Trade Management",
        type: "video",
        videoUrl: "",
        pdfUrl: "",
        notes: `
<h3>Confirmation Checklist</h3>
<ul>
  <li>✔ HTF bias confirmed</li>
  <li>✔ Structure aligned</li>
  <li>✔ Zone identified (fresh/strong)</li>
  <li>✔ Liquidity sweep or inducement</li>
  <li>✔ Entry model confirmed</li>
  <li>✔ Risk defined</li>
  <li>✔ Psychology clear</li>
</ul>

<h3>Trade Management</h3>
<ul>
  <li>Always use a stop loss behind the zone</li>
  <li>Move to break-even when price moves 1R</li>
  <li>Take partial profits at 1R and 2R</li>
  <li>Let runners ride with trailing stop</li>
</ul>

<h3>Exit Strategy</h3>
<ul>
  <li>Exit at key structure levels</li>
  <li>Exit when price reaches supply/demand zones</li>
  <li>Exit when liquidity is swept</li>
  <li>Exit based on RR target (2:1 or 3:1 minimum)</li>
</ul>
`
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        {
          question: "What does LC-1 stand for?",
          options: ["Liquidity Capture 1", "Low Confidence 1", "Long Call 1", "Limit Close 1"],
          correct: 0
        },
        {
          question: "What is the main purpose of a confirmation checklist?",
          options: ["Avoid impulsive entries", "Increase position size", "Trade more frequently", "Use higher leverage"],
          correct: 0
        },
        {
          question: "What is LTF RE?",
          options: ["Lower Timeframe Re-entry", "Long Term Fibonacci Retracement", "Limit Trade Framework", "Liquidity Trend Reversal"],
          correct: 0
        },
        {
          question: "What is a recommended minimum risk-to-reward ratio?",
          options: ["1:1", "2:1", "5:1", "10:1"],
          correct: 1
        }
      ]
    }
  },

  // ============================================================
  // MODULE 6 – RISK MANAGEMENT
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
        title: "Risk Fundamentals",
        type: "video",
        videoUrl: "",
        pdfUrl: "",
        notes: `
<h3>Position Sizing</h3>
<p>Calculate position size based on account risk percentage and stop loss distance.</p>
<p>Formula: Position Size = (Account Balance × Risk %) / (Stop Loss in pips × Pip Value)</p>

<h3>Risk Per Trade</h3>
<p>Recommended risk per trade for beginners: 1-2% of account balance.</p>
<p>Never risk more than you can afford to lose.</p>

<h3>Daily & Weekly Limits</h3>
<p>Set daily loss limits (e.g., 3% of account) and weekly loss limits (e.g., 6% of account).</p>
<p>If you hit your daily limit, stop trading for the day.</p>
`
      },
      {
        id: "lsn_6_2",
        title: "Advanced Risk Management",
        type: "video",
        videoUrl: "",
        pdfUrl: "",
        notes: `
<h3>Risk-to-Reward (R:R)</h3>
<p>Minimum target: 2:1 R:R.</p>
<p>Always calculate your risk-to-reward ratio before entering a trade.</p>

<h3>Prop Firm Rules</h3>
<p>If trading with a prop firm:</p>
<ul>
  <li>Follow daily drawdown limits</li>
  <li>Follow maximum drawdown limits</li>
  <li>Respect position size limits</li>
</ul>

<h3>Managing Drawdown</h3>
<ul>
  <li>Reduce position size during drawdown</li>
  <li>Take a break after a losing streak</li>
  <li>Review your journal to identify mistakes</li>
  <li>Stick to your risk parameters</li>
</ul>

<h3>The Golden Rule</h3>
<p><strong>Preserve your capital above all else.</strong> Without capital, you cannot trade.</p>
`
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        {
          question: "What is a recommended risk per trade for beginners?",
          options: ["1-2%", "5-10%", "20%", "50%"],
          correct: 0
        },
        {
          question: "What is drawdown?",
          options: ["Peak-to-trough decline in equity", "Maximum profit", "Average win", "Total trades"],
          correct: 0
        },
        {
          question: "What is the golden rule of trading?",
          options: ["Preserve your capital", "Make maximum profit", "Trade every day", "Use high leverage"],
          correct: 0
        },
        {
          question: "What is a recommended daily loss limit?",
          options: ["1%", "3%", "10%", "20%"],
          correct: 1
        }
      ]
    }
  },

  // ============================================================
  // MODULE 7 – TRADING PSYCHOLOGY
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
        title: "Psychology Fundamentals",
        type: "video",
        videoUrl: "",
        pdfUrl: "",
        notes: `
<h3>Discipline</h3>
<p>Discipline is the ability to follow your trading plan even when emotions are high.</p>
<p>Rules are easier to follow when they are simple and specific.</p>

<h3>Patience</h3>
<p>Patience is the ability to wait for your setup and not force trades.</p>
<p>The market will always offer another opportunity.</p>

<h3>Emotional Control</h3>
<p>Control fear, greed, and hope. These emotions destroy trading accounts.</p>
<ul>
  <li><strong>Fear:</strong> Leads to missed opportunities and early exits</li>
  <li><strong>Greed:</strong> Leads to overtrading and oversized positions</li>
  <li><strong>Hope:</strong> Leads to holding losing trades</li>
</ul>
`
      },
      {
        id: "lsn_7_2",
        title: "Building Consistency",
        type: "video",
        videoUrl: "",
        pdfUrl: "",
        notes: `
<h3>Trading Routine</h3>
<p>A consistent routine builds consistency in trading.</p>
<ul>
  <li>Pre-market preparation</li>
  <li>Review previous trades</li>
  <li>Identify key levels</li>
  <li>Wait for setups</li>
  <li>Journal every trade</li>
  <li>Post-market review</li>
</ul>

<h3>Building Consistency</h3>
<ul>
  <li>Follow your trading plan every time</li>
  <li>Accept losses as part of the process</li>
  <li>Focus on execution, not profit</li>
  <li>Keep a trading journal</li>
  <li>Review and improve weekly</li>
</ul>

<h3>Common Trading Mistakes</h3>
<ul>
  <li>Overtrading</li>
  <li>Revenge trading</li>
  <li>Moving stop losses</li>
  <li>Not following the plan</li>
  <li>Ignoring risk management</li>
  <li>Trading emotionally</li>
</ul>

<h3>Key Takeaway</h3>
<p>Consistency in execution leads to consistency in results. Focus on process, not outcomes.</p>
`
      }
    ],
    quiz: {
      passingScore: 70,
      questions: [
        {
          question: "What is the most common mistake traders make?",
          options: ["Overtrading", "Using stop losses", "Following a plan", "Keeping a journal"],
          correct: 0
        },
        {
          question: "How can you improve trading consistency?",
          options: ["Stick to your trading plan", "Trade every signal", "Increase risk", "Ignore the market"],
          correct: 0
        },
        {
          question: "What emotion leads to holding losing trades?",
          options: ["Hope", "Fear", "Greed", "Overconfidence"],
          correct: 0
        },
        {
          question: "What is the key to consistency?",
          options: ["Following your trading plan", "Making more money", "Trading more often", "Using higher leverage"],
          correct: 0
        }
      ]
    }
  }
];
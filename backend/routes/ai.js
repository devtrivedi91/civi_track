import express from "express";
import Groq from "groq-sdk";

const router = express.Router();

let aiClient = null;
function getAI() {
  if (!aiClient) {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      console.warn(
        "WARNING: GROQ_API_KEY environment variable is not set. AI features will fallback to mock responses."
      );
    }
    aiClient = new Groq({
      apiKey: key || "MOCK_KEY",
    });
  }
  return aiClient;
}

function parseJSONRobustly(text, fallback) {
  try {
    const cleanJson = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (innerError) {
      console.error("Regex extraction of JSON failed:", innerError);
    }
    console.error("Failed to parse JSON, returning fallback structure:", e);
    return fallback;
  }
}

function generateMockAnalysis(finalDescription) {
  const descLower = finalDescription.toLowerCase();
  let selectedCategory = "Road Damage";
  if (
    descLower.includes("pothole") ||
    descLower.includes("hole") ||
    descLower.includes("bump")
  )
    selectedCategory = "Potholes";
  else if (
    descLower.includes("water") ||
    descLower.includes("leak") ||
    descLower.includes("pipe")
  )
    selectedCategory = "Water Leakage";
  else if (
    descLower.includes("light") ||
    descLower.includes("lamp") ||
    descLower.includes("bulb") ||
    descLower.includes("dark")
  )
    selectedCategory = "Streetlight Failure";
  else if (
    descLower.includes("trash") ||
    descLower.includes("garbage") ||
    descLower.includes("waste") ||
    descLower.includes("dump")
  )
    selectedCategory = "Garbage Collection";
  else if (
    descLower.includes("sewer") ||
    descLower.includes("drain") ||
    descLower.includes("smell")
  )
    selectedCategory = "Sewage Problems";
  else if (
    descLower.includes("traffic") ||
    descLower.includes("signal") ||
    descLower.includes("light change")
  )
    selectedCategory = "Traffic Signal Issues";
  else if (
    descLower.includes("safety") ||
    descLower.includes("crime") ||
    descLower.includes("suspicious")
  )
    selectedCategory = "Public Safety Concerns";
  else if (
    descLower.includes("park") ||
    descLower.includes("bench") ||
    descLower.includes("tree")
  )
    selectedCategory = "Park Maintenance";

  const severity =
    descLower.includes("urgent") ||
    descLower.includes("danger") ||
    descLower.includes("emergency")
      ? "Critical"
      : "Medium";
  const urgency = severity === "Critical" ? "Emergency" : "Normal";

  const departments = {
    Potholes: "Public Works Department",
    "Water Leakage": "Water Supply & Sewerage Board",
    "Streetlight Failure": "Electrical Authority",
    "Garbage Collection": "Sanitation Department",
    "Road Damage": "Public Works Department",
    "Illegal Dumping": "Sanitation Department",
    "Sewage Problems": "Water Supply & Sewerage Board",
    "Traffic Signal Issues": "Traffic Control Division",
    "Public Safety Concerns": "Local Police & Vigilance",
    "Park Maintenance": "Horticulture Department",
  };

  const isEmergency =
    descLower.includes("flood") ||
    descLower.includes("fire") ||
    descLower.includes("accident") ||
    descLower.includes("wire");
  let emergencyType = null;
  if (descLower.includes("flood")) emergencyType = "Flood";
  else if (descLower.includes("fire")) emergencyType = "Fire";
  else if (descLower.includes("accident")) emergencyType = "Accident";
  else if (descLower.includes("wire") || descLower.includes("electric"))
    emergencyType = "Electrical Hazard";

  return {
    title: `Reported Issue: ${selectedCategory}`,
    description: finalDescription,
    category: selectedCategory,
    severity,
    urgency,
    suggestedDepartment:
      departments[selectedCategory] || "Municipal Administration",
    summary: `The issue reports a concern related to ${selectedCategory.toLowerCase()}. Immediate inspection is recommended.`,
    detectedObjects: [selectedCategory.toLowerCase()],
    isEmergency,
    emergencyType,
  };
}

function generateMockAssistantResponse(message) {
  const lower = message.toLowerCase();
  let response =
    "I am Community Hero AI assistant. I can help you report issues, find status updates, and understand local government departments. ";
  if (lower.includes("pothole") || lower.includes("road")) {
    response +=
      "Road and pothole repairs are handled by the Public Works Department. Typically, reports with higher community upvotes are prioritized and resolved within 3-5 business days.";
  } else if (lower.includes("garbage") || lower.includes("waste")) {
    response +=
      "Illegal dumping and waste overflow are directed to the Sanitation Department. Routine trash cleanups are scheduled weekly, but critical items are attended to within 24 hours.";
  } else if (lower.includes("leak") || lower.includes("water")) {
    response +=
      "Water leakage is managed by the Water Supply & Sewerage Board. Please submit a report with photos so technicians can locate the exact pipeline breach.";
  } else {
    response +=
      "How else can I assist you? You can ask about municipal services, who handles repairs, or how to claim volunteering points!";
  }
  return { response };
}

const MOCK_PREDICTIONS = [
  {
    area: "Ward 4 - Sector C (Downtown)",
    type: "Waste Accumulation Spike",
    confidence: 88,
    description:
      "Historically high weekend waste volume coupled with recent festival events indicates an imminent trash overflow near the main market gates.",
    actions:
      "Deploy additional mobile collection bins; schedule an early morning sanitation run for Saturday/Sunday.",
  },
  {
    area: "Ward 12 - Metro Crossing Road",
    type: "High-Risk Pothole Formations",
    confidence: 76,
    description:
      "Heavy rainfall patterns combined with age-damaged asphalt in the high-traffic transit lane predicts serious structural fissures within the next 7 days.",
    actions:
      "Pre-emptively apply cold-mix patching; divert heavy freight traffic to alternative lanes.",
  },
  {
    area: "Ward 9 - East Residential Park",
    type: "Water Pipeline Rupture Risk",
    confidence: 65,
    description:
      "Repeated minor leak reports near Sector 2 main pipeline combined with sudden water pressure surges suggests a major underground gasket failure.",
    actions:
      "Execute pressure-monitoring survey; notify the water engineering team to inspect valves on South Street.",
  },
  {
    area: "Ward 3 - Industrial Avenue",
    type: "Streetlight Circuit Tripping",
    confidence: 82,
    description:
      "Power quality logs show voltage fluctuation anomalies during monsoon evenings, threatening to dark-out 1.2km of high-density pedestrian lanes.",
    actions:
      "Reinforce transformer insulators; execute immediate relay checks on poles #45 to #70.",
  },
];

router.post("/analyze-issue", async (req, res) => {
  try {
    const { image, description, voiceText, lat, lng } = req.body;
    const finalDescription =
      voiceText || description || "No description provided.";

    const hasApiKey = !!process.env.GROQ_API_KEY;

    if (!hasApiKey) {
      return res.json(generateMockAnalysis(finalDescription));
    }

    const ai = getAI();
    let prompt = `You are an expert Civic AI platform analyzer. Analyze the following user description and metadata of a community problem, and classify it.
    
User Description: "${finalDescription}"

Provide your assessment in RAW JSON format with EXACTLY these fields:
{
  "title": "A short, concise, and professional title (5-10 words)",
  "description": "A refined, detailed version of the description with grammar fixed",
  "category": "Must be exactly one of: 'Potholes', 'Water Leakage', 'Streetlight Failure', 'Garbage Collection', 'Road Damage', 'Illegal Dumping', 'Sewage Problems', 'Traffic Signal Issues', 'Public Safety Concerns', 'Park Maintenance'",
  "severity": "Must be exactly: 'Low', 'Medium', 'High', 'Critical'",
  "urgency": "Must be exactly: 'Normal', 'Urgent', 'Emergency'",
  "suggestedDepartment": "The name of the municipal department best suited to solve this (e.g. Sanitation Department, Public Works Department, Electrical Authority, Water Supply Board, Horticulture Department)",
  "summary": "A 1-2 sentence professional summary of the problem and potential impact",
  "detectedObjects": ["list", "of", "relevant", "objects", "or", "hazards", "identified"],
  "isEmergency": true/false (set to true if the issue is a direct high-threat emergency like floods, active fires, serious vehicle accidents, or exposed live electrical hazards),
  "emergencyType": "Flood" | "Fire" | "Accident" | "Electrical Hazard" | null
}

Response MUST be pure JSON, no markdown blocks, no formatting wrappers.`;

    let response;
    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const imageDataUrl = `data:image/jpeg;base64,${base64Data}`;
      response = await ai.chat.completions.create({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],
      });
    } else {
      response = await ai.chat.completions.create({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });
    }

    const text = response.choices[0]?.message?.content || "";
    const result = parseJSONRobustly(text, {
      title: `Reported Issue`,
      description: finalDescription,
      category: "Road Damage",
      severity: "Medium",
      urgency: "Normal",
      suggestedDepartment: "Public Works Department",
      summary:
        "An issue was reported by a citizen. Immediate inspection is recommended.",
      detectedObjects: [],
      isEmergency: false,
      emergencyType: null,
    });
    res.json(result);
  } catch (error) {
    console.error("Error analyzing issue, falling back to mock:", error);
    try {
      const { description, voiceText } = req.body;
      const finalDescription =
        voiceText || description || "No description provided.";
      return res.json(generateMockAnalysis(finalDescription));
    } catch (fallbackError) {
      return res.json(generateMockAnalysis("No description provided."));
    }
  }
});

router.post("/assistant", async (req, res) => {
  try {
    const { message, history } = req.body;
    const hasApiKey = !!process.env.GROQ_API_KEY;

    if (!hasApiKey) {
      return res.json(generateMockAssistantResponse(message));
    }

    const ai = getAI();
    const systemInstruction = `You are the Community Hero AI Civic Assistant. You are friendly, helpful, and highly knowledgeable about local governance, municipal guidelines, urban safety, and how the Community Hero AI Platform works.
        
Guidelines for your responses:
1. Provide accurate and actionable guidance about municipal service categories: Potholes, Water Leakages, Streetlight Failures, Garbage Collection, Road Damage, Illegal Dumping, Sewage Problems, Traffic Signal Issues, Public Safety, and Park Maintenance.
2. Direct users to the correct department (e.g. Public Works Department for road/potholes, Sanitation for trash, Electrical Authority for streetlights, etc.).
3. Explain the gamification rules: reporting an issue earns 10 points, verifying earns 5 points, and resolving/contributing earns 20 points.
4. Keep your responses concise, highly professional, polite, and encouraging civic participation. Use clear bullet points if giving step-by-step guidelines.`;

    const messages = [
      {
        role: "system",
        content: systemInstruction,
      },
    ];

    if (history && Array.isArray(history)) {
      for (const turn of history) {
        if (turn.role && turn.content) {
          messages.push({
            role: turn.role,
            content: turn.content,
          });
        }
      }
    }

    messages.push({
      role: "user",
      content: message,
    });

    const result = await ai.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: messages,
    });

    const responseText =
      result.choices[0]?.message?.content ||
      "I encountered an issue processing your request.";
    res.json({ response: responseText });
  } catch (error) {
    console.error("Error in Civic Assistant, falling back to mock:", error);
    const message = req.body.message || "";
    res.json(generateMockAssistantResponse(message));
  }
});

router.post("/predictive-insights", async (req, res) => {
  try {
    const { issuesList } = req.body;
    const hasApiKey = !!process.env.GROQ_API_KEY;

    if (!hasApiKey || !issuesList || issuesList.length < 3) {
      return res.json({ predictions: MOCK_PREDICTIONS });
    }

    const ai = getAI();
    const prompt = `You are a Smart City Predictive Analytics Engine. Analyze the following list of recently reported civic issues and historical complaints, and generate 3-4 highly plausible infrastructure predictions for the coming week.
    
Issues list:
${JSON.stringify(issuesList)}

Provide your output in RAW JSON format (no markdown blocks or formatting) containing exactly this structure:
{
  "predictions": [
    {
      "area": "Name of the area/ward at risk",
      "type": "Predictive threat type (e.g. Waste Accumulation, Water Pipeline Burst, High-Risk Pothole, Dark Zone Risk)",
      "confidence": 0-100 (percentage integer based on frequency/clustering of issues),
      "description": "Scientific, data-backed reasoning for why this prediction was made based on the input logs",
      "actions": "Specific preemptive actions the city municipal authority should take to mitigate the issue"
    }
  ]
}
Response must be pure JSON.`;

    const response = await ai.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const result = parseJSONRobustly(text, { predictions: MOCK_PREDICTIONS });
    res.json(result);
  } catch (error) {
    console.error("Error generating predictive insights, falling back:", error);
    res.json({ predictions: MOCK_PREDICTIONS });
  }
});

router.post("/recommend-resolution", async (req, res) => {
  const { category, title, description } = req.body;

  const recommendations = {
    Potholes: {
      steps: [
        "Secure the hazard area with safety cones and high-visibility road tape.",
        "Excavate the pothole sides to form vertical edges for maximum adhesion.",
        "Clean out all loose debris, dirt, and water from the pothole base.",
        "Apply a standard emulsion tack coat evenly inside the cavity.",
        "Fill with durable hot asphalt mix (or cold mix for temporary wet weather patches).",
        "Compact fully using a mechanical vibratory roller or heavy hand tamper to align with road grade.",
      ],
      materials: [
        "Hot Asphalt Mix",
        "Emulsion Tack Coat",
        "Crushed Gravel Sub-base",
        "Safety Cones",
      ],
      estimatedHours: 3,
      difficulty: "Medium",
    },
    "Garbage Collection": {
      steps: [
        "Dispatch a rear-loader refuse truck with a crew of three sanitary workers.",
        "Manually clean scattered bags using heavy shovels, ensuring the area is entirely clear.",
        "Apply environmental-safe lime powder over the wet ground to neutralize odors and deter pests.",
        "Install permanent weatherproof warning signs: 'No Dumping - Fine $200'.",
        "Set up a solar-powered CCTV camera nearby to monitor illegal fly-tipping.",
      ],
      materials: [
        "Lime Powder Sanitizer",
        "Signboard: 'No Dumping'",
        "Solar CCTV Camera",
        "Refuse Disposal Bags",
      ],
      estimatedHours: 1.5,
      difficulty: "Low",
    },
    "Streetlight Failure": {
      steps: [
        "Deploy a hydraulic boom lift utility truck with an electrical line technician.",
        "De-energize the local feeder pillar circuit line to ensure safety.",
        "Test the physical streetlight holder and photosensor unit for corrosion or short-circuits.",
        "Replace the faulty bulb with a highly energy-efficient 120W LED fixture.",
        "Restore power and verify illumination; inspect the wiring insulation to prevent grounding faults.",
      ],
      materials: [
        "120W LED Streetlight Bulb",
        "Photocell Sensor Kit",
        "Insulating Heat-Shrink Sleeves",
        "Fuse Spares",
      ],
      estimatedHours: 2,
      difficulty: "High",
    },
  };

  const fallback = recommendations[category] || {
    steps: [
      "Dispatch an engineering inspector to carry out physical verification.",
      "Establish temporary containment or safety barricades around the perimeter.",
      "Identify structural materials needed and draft a detailed labor invoice.",
      "Execute mechanical or physical repairs following the standard municipal guidelines.",
      "Perform final audit, clean the surrounding landscape, and log complete before-after photos.",
    ],
    materials: [
      "Standard Safety Barricades",
      "Basic Inspector Toolkits",
      "Site Signs",
    ],
    estimatedHours: 4,
    difficulty: "Medium",
  };

  try {
    const hasApiKey = !!process.env.GROQ_API_KEY;

    if (!hasApiKey) {
      return res.json(fallback);
    }

    const ai = getAI();
    const prompt = `You are an expert Civil Engineering Assistant. Recommend a detailed step-by-step resolution plan for the following municipal issue:
Category: ${category}
Title: ${title}
Description: ${description}


Provide your output in RAW JSON format (no formatting, no markdown) containing exactly this structure:
{
  "steps": [
    "Step 1 with technical detail",
    "Step 2 with safety recommendations",
    "Step 3 with execution steps",
    "Step 4 with finishing/auditing guidelines"
  ],
  "materials": ["Material 1", "Material 2", "Material 3"],
  "estimatedHours": Number (estimated active labor hours to complete this job),
  "difficulty": "Low" | "Medium" | "High"
}
Response must be pure JSON.`;

    const response = await ai.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const result = parseJSONRobustly(text, fallback);
    res.json(result);
  } catch (error) {
    console.error("Error generating resolution plan, falling back:", error);
    res.json(fallback);
  }
});

export default router;

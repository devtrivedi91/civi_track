import { Issue, UserProfile, LeaderboardEntry, PredictiveInsight } from "../types";

export const initialMockUsers: UserProfile[] = [
  {
    uid: "citizen1",
    name: "Aarav Sharma",
    email: "aarav@community.org",
    role: "Citizen",
    location: "Ward 4 - Sector C",
    points: 185,
    badges: ["Local Hero", "Super Reporter", "Community Helper"],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    uid: "citizen2",
    name: "Pooja Patel",
    email: "pooja@community.org",
    role: "Citizen",
    location: "Ward 12 - Metro Crossing",
    points: 140,
    badges: ["Civic Guardian", "Problem Solver"],
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    uid: "officer1",
    name: "Officer Rajesh Kumar",
    email: "rajesh@municipal.gov.in",
    role: "Officer",
    location: "Ward 4 - Sector C",
    points: 0,
    badges: [],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    uid: "officer2",
    name: "Officer Sunita Mehta",
    email: "sunita@municipal.gov.in",
    role: "Officer",
    location: "Ward 12 - Metro Crossing",
    points: 0,
    badges: [],
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    uid: "admin1",
    name: "Ananya Desai",
    email: "admin@communityhero.ai",
    role: "Admin",
    location: "City Head Office",
    points: 0,
    badges: [],
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    uid: "hackathon-admin",
    name: "Demo Admin - Hackathon Jury",
    email: "hackathon.admin@communityhero.ai",
    role: "Admin",
    location: "Command Center - Demo City",
    points: 0,
    badges: ["Command Center", "Demo Supervisor"],
    createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    uid: "ward-ops-demo",
    name: "Officer Neha Iyer",
    email: "neha.iyer@municipal.gov.in",
    role: "Officer",
    location: "Ward 9 - East Residential",
    points: 0,
    badges: ["Rapid Response"],
    createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    uid: "citizen-demo-rahul",
    name: "Rahul Verma",
    email: "rahul.verma@community.org",
    role: "Citizen",
    location: "Ward 9 - East Residential",
    points: 88,
    badges: ["Community Helper"],
    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const demoAuthAccounts = [
  { uid: "citizen1", email: "aarav@community.org", password: "Demo@12345" },
  { uid: "citizen2", email: "pooja@community.org", password: "Demo@12345" },
  { uid: "officer1", email: "rajesh@municipal.gov.in", password: "Demo@12345" },
  { uid: "officer2", email: "sunita@municipal.gov.in", password: "Demo@12345" },
  { uid: "admin1", email: "admin@communityhero.ai", password: "Demo@12345" },
  { uid: "hackathon-admin", email: "hackathon.admin@communityhero.ai", password: "Demo@12345" },
  { uid: "ward-ops-demo", email: "neha.iyer@municipal.gov.in", password: "Demo@12345" },
  { uid: "citizen-demo-rahul", email: "rahul.verma@community.org", password: "Demo@12345" }
];

export const initialMockIssues: Issue[] = [
  {
    issueId: "issue-1",
    title: "Crater-sized Pothole on Market Main Road",
    description: "A huge, deep pothole has opened up right near the vegetable market entrance. It is filled with stagnant rainwater, making it highly invisible at night. Two motorcyclists have already slipped today. Need immediate patch repairs.",
    category: "Potholes",
    severity: "Critical",
    urgency: "Emergency",
    status: "In Progress",
    images: ["https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop"],
    videos: [],
    location: {
      lat: 19.0790,
      lng: 72.8800,
      address: "Near Vegetable Market Gate, Market Rd, Sector C, Mumbai",
      areaName: "Ward 4 - Sector C"
    },
    reporterId: "citizen1",
    reporterName: "Aarav Sharma",
    verificationScore: 24,
    upvotes: ["citizen1", "citizen2", "user-3", "user-4"],
    evidenceCount: 2,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    department: "Public Works Department",
    timeline: [
      {
        status: "Reported",
        note: "Issue submitted by Aarav Sharma. AI classified category as Potholes with Critical severity.",
        updatedBy: "System AI",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        status: "Verified",
        note: "Verified by 4 community upvotes and supplementary evidence uploaded by Pooja Patel.",
        updatedBy: "Moderator System",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        status: "Assigned",
        note: "Assigned to Engineer Officer Rajesh Kumar. Action plan requested.",
        updatedBy: "Admin System",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        status: "In Progress",
        note: "Sewer and base debris cleared. Hot asphalt mix ordered and compaction crew scheduled for tomorrow.",
        updatedBy: "Officer Rajesh Kumar",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    isEmergency: true,
    emergencyType: "Accident"
  },
  {
    issueId: "issue-2",
    title: "Massive Illegal Garbage Dumping in Play Park",
    description: "An entire corner of the children's park has been converted into a trash dumpsite. Commercial waste, plastic crates, and medical waste have been dumped overnight. Stray dogs are scattering it and it smells horrible. Children can no longer play.",
    category: "Illegal Dumping",
    severity: "High",
    urgency: "Urgent",
    status: "Reported",
    images: ["https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=600&auto=format&fit=crop"],
    videos: [],
    location: {
      lat: 19.0735,
      lng: 72.8710,
      address: "Children Play Park Corner, Sector 2, Mumbai",
      areaName: "Ward 12 - Metro Crossing"
    },
    reporterId: "citizen2",
    reporterName: "Pooja Patel",
    verificationScore: 12,
    upvotes: ["citizen2", "user-5", "user-6"],
    evidenceCount: 0,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    department: "Sanitation Department",
    timeline: [
      {
        status: "Reported",
        note: "Issue submitted by Pooja Patel. AI classified category as Illegal Dumping with High severity.",
        updatedBy: "System AI",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    isEmergency: false,
    emergencyType: null
  },
  {
    issueId: "issue-3",
    title: "Burst Main Water Pipe - Fresh Water Wasted",
    description: "The primary 10-inch water supply pipe has burst under the pavement. Fresh potable water is gushing out like a fountain. It has flooded the pedestrian walkway and is causing severe water logging on the road. Millions of gallons are wasting.",
    category: "Water Leakage",
    severity: "High",
    urgency: "Emergency",
    status: "Resolved",
    images: ["https://images.unsplash.com/photo-1542013936693-8848e574047a?q=80&w=600&auto=format&fit=crop"],
    videos: [],
    location: {
      lat: 19.0680,
      lng: 72.8845,
      address: "Metro Pillar 145, S.V. Road, Mumbai",
      areaName: "Ward 12 - Metro Crossing"
    },
    reporterId: "citizen1",
    reporterName: "Aarav Sharma",
    verificationScore: 35,
    upvotes: ["citizen1", "citizen2", "user-3", "user-4", "user-5", "user-6", "user-7"],
    evidenceCount: 3,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    department: "Water Supply & Sewerage Board",
    timeline: [
      {
        status: "Reported",
        note: "Issue submitted by Aarav Sharma. AI classified category as Water Leakage with High severity.",
        updatedBy: "System AI",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        status: "Verified",
        note: "Verified by 7 community upvotes. Escalated due to emergency flood risk.",
        updatedBy: "Moderator System",
        createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        status: "Assigned",
        note: "Assigned to Water Board Engineer Officer Sunita Mehta.",
        updatedBy: "Admin System",
        createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        status: "In Progress",
        note: "Valves throttled to isolate the line. Backhoe excavator on site to clear pavement blocks.",
        updatedBy: "Officer Sunita Mehta",
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        status: "Resolved",
        note: "Faulty collar gasket replaced and pipe welded. Road resurfacing completed. Fully operational.",
        updatedBy: "Officer Sunita Mehta",
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        status: "Closed",
        note: "Resolution confirmed by reporter Aarav Sharma. Volunteer contribution points disbursed.",
        updatedBy: "System AI",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    isEmergency: true,
    emergencyType: "Flood"
  },
  {
    issueId: "issue-4",
    title: "Broken Streetlight Feeder - Entire Block Dark",
    description: "A total of 8 streetlights are completely dead on lane 3 of Sector B. It creates a pitch-black zone in the evening which is highly unsafe for senior citizens and women walking home from the metro station.",
    category: "Streetlight Failure",
    severity: "Medium",
    urgency: "Normal",
    status: "Assigned",
    images: ["https://images.unsplash.com/photo-1509024644558-2f56ce76c490?q=80&w=600&auto=format&fit=crop"],
    videos: [],
    location: {
      lat: 19.0812,
      lng: 72.8720,
      address: "Lane 3, Sector B Residential Area, Mumbai",
      areaName: "Ward 4 - Sector C"
    },
    reporterId: "citizen2",
    reporterName: "Pooja Patel",
    verificationScore: 8,
    upvotes: ["citizen2", "user-8"],
    evidenceCount: 1,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    department: "Electrical Authority",
    timeline: [
      {
        status: "Reported",
        note: "Issue submitted by Pooja Patel.",
        updatedBy: "System AI",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        status: "Verified",
        note: "Verified by community upvotes.",
        updatedBy: "System AI",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        status: "Assigned",
        note: "Assigned to Electrical Inspector Officer Rajesh Kumar.",
        updatedBy: "Admin System",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    isEmergency: false,
    emergencyType: null
  }
];

export const mockLeaderboard: LeaderboardEntry[] = [
  { userId: "citizen1", name: "Aarav Sharma", points: 185, badges: ["Local Hero", "Super Reporter", "Community Helper"], rank: 1, area: "Ward 4 - Sector C" },
  { userId: "citizen2", name: "Pooja Patel", points: 140, badges: ["Civic Guardian", "Problem Solver"], rank: 2, area: "Ward 12 - Metro Crossing" },
  { userId: "user-3", name: "Rohan Jha", points: 110, badges: ["Community Helper"], rank: 3, area: "Ward 4 - Sector C" },
  { userId: "user-4", name: "Meera Nair", points: 95, badges: ["Civic Guardian"], rank: 4, area: "Ward 12 - Metro Crossing" },
  { userId: "user-5", name: "Kabir Sen", points: 75, badges: ["Super Reporter"], rank: 5, area: "Ward 4 - Sector C" }
];

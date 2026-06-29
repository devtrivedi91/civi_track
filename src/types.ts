export type UserRole = "Citizen" | "Moderator" | "Officer" | "Admin";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  location?: string;
  profilePhoto?: string;
  points: number;
  badges: string[];
  createdAt: string;
}

export interface TimelineEvent {
  status: "Reported" | "Verified" | "Assigned" | "In Progress" | "Resolved" | "Closed";
  note: string;
  photo?: string | null;
  updatedBy: string;
  createdAt: string;
}

export interface IssueLocation {
  lat: number;
  lng: number;
  address: string;
  areaName: string;
}

export interface Issue {
  issueId: string;
  title: string;
  description: string;
  category: "Potholes" | "Water Leakage" | "Streetlight Failure" | "Garbage Collection" | "Road Damage" | "Illegal Dumping" | "Sewage Problems" | "Traffic Signal Issues" | "Public Safety Concerns" | "Park Maintenance";
  severity: "Low" | "Medium" | "High" | "Critical";
  urgency: "Normal" | "Urgent" | "Emergency";
  status: "Reported" | "Verified" | "Assigned" | "In Progress" | "Resolved" | "Closed";
  images: string[];
  videos: string[];
  location: IssueLocation;
  reporterId: string;
  reporterName: string;
  verificationScore: number;
  upvotes: string[]; // List of userIds who upvoted
  evidenceCount: number;
  createdAt: string;
  department: string;
  timeline: TimelineEvent[];
  isEmergency: boolean;
  emergencyType: "Flood" | "Fire" | "Accident" | "Electrical Hazard" | null;
  qrCode?: string;
  voiceUrl?: string;
  duplicateOf?: string; // Id of original issue if duplicate
  resolutionNotes?: string;
}

export interface Comment {
  commentId: string;
  issueId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  message: string;
  createdAt: string;
}

export interface Verification {
  verificationId: string;
  issueId: string;
  userId: string;
  evidencePhoto?: string;
  note?: string;
  createdAt: string;
}

export interface Notification {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  badges: string[];
  rank: number;
  area?: string;
}

export interface PredictiveInsight {
  area: string;
  type: string;
  confidence: number;
  description: string;
  actions: string;
}

export interface ResolutionRecommendation {
  steps: string[];
  materials: string[];
  estimatedHours: number;
  difficulty: "Low" | "Medium" | "High";
}

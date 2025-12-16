import React from 'react';

export enum Role {
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
  POLICE = 'POLICE',
  INSURANCE = 'INSURANCE'
}

export enum View {
  // Public
  LANDING = 'LANDING',
  HOW_IT_WORKS = 'HOW_IT_WORKS',
  FEATURES = 'FEATURES',
  PRICING = 'PRICING',
  CONTACT = 'CONTACT',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  
  // Driver
  DRIVER_DASHBOARD = 'DRIVER_DASHBOARD',
  DRIVER_LIVE = 'DRIVER_LIVE',
  DRIVER_ACCIDENTS = 'DRIVER_ACCIDENTS',
  DRIVER_ACCIDENT_DETAIL = 'DRIVER_ACCIDENT_DETAIL',
  DRIVER_CLAIMS = 'DRIVER_CLAIMS',
  DRIVER_DOCUMENTS = 'DRIVER_DOCUMENTS',
  DRIVER_AI_SCORE = 'DRIVER_AI_SCORE',
  DRIVER_NOTIFICATIONS = 'DRIVER_NOTIFICATIONS',
  DRIVER_PROFILE = 'DRIVER_PROFILE',
  
  // Admin
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  ADMIN_USERS = 'ADMIN_USERS',
  ADMIN_VEHICLES = 'ADMIN_VEHICLES',
  ADMIN_ACCIDENTS = 'ADMIN_ACCIDENTS',
  ADMIN_ANALYTICS = 'ADMIN_ANALYTICS',
  ADMIN_BLOCKCHAIN = 'ADMIN_BLOCKCHAIN',
  ADMIN_SETTINGS = 'ADMIN_SETTINGS',
  
  // Police
  POLICE_DASHBOARD = 'POLICE_DASHBOARD',
  POLICE_VERIFY = 'POLICE_VERIFY',
  
  // Insurance
  INSURANCE_DASHBOARD = 'INSURANCE_DASHBOARD',
  INSURANCE_REVIEW = 'INSURANCE_REVIEW',
  INSURANCE_PAYMENTS = 'INSURANCE_PAYMENTS',
  
  // System
  LOGS = 'LOGS'
}

export enum Severity {
  MINOR = 'Minor',
  MODERATE = 'Moderate',
  SEVERE = 'Severe',
  CRITICAL = 'Critical'
}

export enum ClaimStatus {
  PENDING = 'Pending',
  UNDER_REVIEW = 'Under Review',
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

export enum VerificationStatus {
  UNVERIFIED = 'Unverified',
  VERIFIED = 'Verified',
  DISPUTED = 'Disputed'
}

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email: string;
}

export interface Vehicle {
  id: string;
  model: string;
  plate: string;
  vin: string;
  ownerId: string;
  status: 'Active' | 'Repair' | 'Totaled';
  riskScore: number; // 0-100 (100 is safe)
  insuranceExpiry: string; // ISO Date
}

export interface Accident {
  id: string;
  vehicleId: string;
  driverId: string;
  timestamp: string; // ISO date
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  severity: Severity;
  detectedBy: 'G-Sensor' | 'Manual' | 'AI Camera';
  blockchainHash: string;
  policeVerification: VerificationStatus;
  images: string[];
  aiAnalysis: string;
}

export interface Claim {
  id: string;
  accidentId: string;
  driverId: string;
  amount: number;
  status: ClaimStatus;
  fraudProbability: number; // 0-100%
  submittedAt: string;
  aiNotes: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'ALERT' | 'INFO' | 'SUCCESS';
}

export interface BlockchainLog {
  hash: string;
  action: string;
  timestamp: string;
  status: 'Confirmed' | 'Pending';
  block: number;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: string; // Tailwind class
}
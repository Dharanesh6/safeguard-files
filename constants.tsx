import { Role, Severity, ClaimStatus, VerificationStatus, User, Vehicle, Accident, Claim, Notification, BlockchainLog } from './types';

// Users
export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alex Driver', email: 'alex@driver.com', role: Role.DRIVER, avatar: 'https://picsum.photos/200/200?random=1' },
  { id: 'u2', name: 'System Admin', email: 'admin@safeguard.ai', role: Role.ADMIN, avatar: 'https://picsum.photos/200/200?random=2' },
  { id: 'u3', name: 'Officer Sarah', email: 'sarah@police.gov', role: Role.POLICE, avatar: 'https://picsum.photos/200/200?random=3' },
  { id: 'u4', name: 'Agent Smith', email: 'smith@insurance.com', role: Role.INSURANCE, avatar: 'https://picsum.photos/200/200?random=4' },
];

// Vehicles
export const MOCK_VEHICLES: Vehicle[] = [
  { 
    id: 'v1', 
    model: 'Tesla Model 3', 
    plate: 'ABC-1234', 
    vin: '5YJ3E1EA1JF...', 
    ownerId: 'u1', 
    status: 'Active', 
    riskScore: 92,
    insuranceExpiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // Expires in 5 days
  },
  { 
    id: 'v2', 
    model: 'Toyota Camry', 
    plate: 'XYZ-9876', 
    vin: '4T1B11HK8KU...', 
    ownerId: 'u5', 
    status: 'Repair', 
    riskScore: 45,
    insuranceExpiry: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // Expired 10 days ago
  },
  { 
    id: 'v3', 
    model: 'Ford F-150', 
    plate: 'TRK-9988', 
    vin: '1FTEW1E...', 
    ownerId: 'u7', 
    status: 'Active', 
    riskScore: 88,
    insuranceExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // Expires in 6 months
  },
];

// Accidents
export const MOCK_ACCIDENTS: Accident[] = [
  {
    id: 'acc_001',
    vehicleId: 'v1',
    driverId: 'u1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    location: { lat: 34.0522, lng: -118.2437, address: '101 Highway, Los Angeles, CA' },
    severity: Severity.MODERATE,
    detectedBy: 'G-Sensor',
    blockchainHash: '0x7f9...a3b1',
    policeVerification: VerificationStatus.VERIFIED,
    images: ['https://picsum.photos/400/300?random=10', 'https://picsum.photos/400/300?random=11'],
    aiAnalysis: 'Impact detected on front-right bumper. Speed approx 45mph. High probability of collision with stationary object.'
  },
  {
    id: 'acc_002',
    vehicleId: 'v2',
    driverId: 'u5',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    location: { lat: 37.7749, lng: -122.4194, address: 'Market St, San Francisco, CA' },
    severity: Severity.MINOR,
    detectedBy: 'AI Camera',
    blockchainHash: '0x3c2...99z1',
    policeVerification: VerificationStatus.UNVERIFIED,
    images: ['https://picsum.photos/400/300?random=12'],
    aiAnalysis: 'Low impact rear-end collision. Bumper scratch detected. No airbag deployment.'
  },
  {
    id: 'acc_003',
    vehicleId: 'v3',
    driverId: 'u6',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    location: { lat: 40.7128, lng: -74.0060, address: '5th Ave, New York, NY' },
    severity: Severity.CRITICAL,
    detectedBy: 'G-Sensor',
    blockchainHash: '0x1a9...ffd4',
    policeVerification: VerificationStatus.DISPUTED,
    images: ['https://picsum.photos/400/300?random=13', 'https://picsum.photos/400/300?random=14'],
    aiAnalysis: 'High velocity impact. Multiple airbags deployed. Rollover detected. Immediate medical assistance requested.'
  }
];

// Claims
export const MOCK_CLAIMS: Claim[] = [
  {
    id: 'clm_001',
    accidentId: 'acc_001',
    driverId: 'u1',
    amount: 350000,
    status: ClaimStatus.UNDER_REVIEW,
    fraudProbability: 12,
    submittedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    aiNotes: 'Consistent with telemetry data. Repair estimate matches visual damage analysis.'
  },
  {
    id: 'clm_002',
    accidentId: 'acc_002',
    driverId: 'u5',
    amount: 85000,
    status: ClaimStatus.APPROVED,
    fraudProbability: 2,
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    aiNotes: 'Minor scratch, auto-approved based on low cost and high driver score.'
  }
];

// Notifications
export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'Claim Update', message: 'Your claim #CLM_001 has moved to "Under Review".', date: '2 mins ago', read: false, type: 'INFO' },
  { id: 'n2', title: 'Safety Alert', message: 'Heavy rain detected in your area. Drive carefully.', date: '1 hour ago', read: false, type: 'ALERT' },
  { id: 'n3', title: 'Policy Renewed', message: 'Your insurance policy has been successfully renewed.', date: '1 day ago', read: true, type: 'SUCCESS' },
];

// Blockchain Logs
export const MOCK_BLOCKCHAIN_LOGS: BlockchainLog[] = [
  { hash: '0x8f2...99a1', action: 'ACCIDENT_RECORD_CREATED', timestamp: '2023-10-24 14:32:01', status: 'Confirmed', block: 140291 },
  { hash: '0x1a2...bb44', action: 'CLAIM_SUBMITTED', timestamp: '2023-10-24 15:10:22', status: 'Confirmed', block: 140295 },
  { hash: '0x9c3...dd12', action: 'POLICE_VERIFICATION', timestamp: '2023-10-24 16:05:00', status: 'Pending', block: 140301 },
];
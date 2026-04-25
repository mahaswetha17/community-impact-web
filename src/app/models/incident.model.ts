
// src/app/models/incident.model.ts

export interface Incident {

  id?: string;

  missionId?: string;          // unique mission identifier

  title: string;

  description: string;

  urgency: 'Critical' | 'High' | 'Medium' | 'Low';

  type: string;

  status: 'pending' | 'active' | 'assigned' | 'completed';

  timestamp: string;

  completedAt?: string;

  latitude: number;

  longitude: number;

  victimId?: string;

  volunteerId?: string;

  volunteerName?: string;

  locationName?: string;

  distanceToVolunteer?: number;  // km, filled during AI assignment suggestion

  reviews?: Review[];

}

export interface Review {

  id: string;

  victimId: string;

  rating: number;           // 1-5

  comment: string;

  createdAt: string;

}

export interface AssignmentHistory {

  missionId: string;

  incidentId: string;

  incidentTitle: string;

  incidentType: string;

  victimId: string;

  volunteerId: string;

  volunteerName: string;

  assignedAt: string;

  completedAt?: string;

  status: 'assigned' | 'completed';

  urgency: string;

  locationName?: string;

  latitude: number;

  longitude: number;

}

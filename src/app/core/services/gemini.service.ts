
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

import { Incident } from '../../models/incident.model';

const GEMINI_API_KEY = environment.geminiApiKey;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

@Injectable({ providedIn: 'root' })

export class GeminiService {

  async analyzeIncidentReport(description: string, imageBase64?: string): Promise<any> {

    const prompt = `

You are an emergency response AI. Analyze this incident report and respond ONLY with valid JSON (no markdown, no explanation):

{

  "summary": "brief 1-sentence title of the incident",

  "severity": "Critical | High | Medium | Low",

  "type": "Flood | Fire | Earthquake | Medical | Violence | Other",

  "recommendations": ["action 1", "action 2"]

}

Incident description: ${description}

`;

    const parts: any[] = [{ text: prompt }];

    if (imageBase64) {

      parts.push({

        inline_data: {

          mime_type: 'image/jpeg',

          data: imageBase64

        }

      });

    }

    const response = await fetch(GEMINI_URL, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({

        contents: [{ parts }]

      })

    });

    if (!response.ok) {

      const err = await response.text();

      throw new Error(`Gemini API error: ${response.status} - ${err}`);

    }

    const data = await response.json();

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code fences if present

    const cleaned = rawText.replace(/```json|```/g, '').trim();

    try {

      return JSON.parse(cleaned);

    } catch {

      // If JSON parse fails, return safe defaults based on description

      return {

        summary: description.substring(0, 80),

        severity: 'Medium',

        type: 'Other',

        recommendations: ['Contact local authorities', 'Stay safe']

      };

    }

  }

  async suggestVolunteer(incident: Incident, volunteers: any[]): Promise<string> {

    if (!volunteers.length) return 'volunteer-001';

    const prompt = `

Given this emergency incident:

- Title: ${incident.title}

- Urgency: ${incident.urgency}

- Type: ${incident.type}

- Location: ${incident.latitude}, ${incident.longitude}

And these available volunteers: ${JSON.stringify(volunteers)}

Respond ONLY with the volunteerId string of the best match. No explanation.

`;

    try {

      const response = await fetch(GEMINI_URL, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          contents: [{ parts: [{ text: prompt }] }]

        })

      });

      if (!response.ok) throw new Error('Gemini API error');

      const data = await response.json();

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return rawText.trim() || 'volunteer-001';

    } catch {

      return volunteers[0]?.id || 'volunteer-001';

    }

  }

}

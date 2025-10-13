import { GoogleGenAI } from "@google/genai";
import type { CampusData, Unit } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    console.warn("API_KEY environment variable not set. Generative AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const navigationService = {
  async generateInstructions(path: string[], campusData: CampusData): Promise<string> {
    if (!API_KEY) {
        return "Error: API Key not configured. Cannot generate AI instructions.";
    }
    if (!path || path.length < 2) {
      return "No path to generate instructions for.";
    }

    const pathUnits = path.map(id => campusData.units.find(u => u.id === id)).filter((u): u is Unit => !!u);

    const systemInstruction = `
      You are an indoor navigation assistant for a campus building. Your task is to generate clear, human-friendly, step-by-step instructions for a given path.
      The path is provided as a sequence of connected spaces (units).
      
      Here are the types of units you might encounter:
      - ENTRANCE: The way in or out of the building.
      - CORRIDOR: A hallway.
      - CLASSROOM, OFFICE, RESTAURANT: Destination rooms.
      - STAIRS, ELEVATOR: How to move between floors.

      When generating instructions, pay attention to transitions:
      - When moving from a corridor to a room, say "Enter [Room Name]".
      - When moving between floors, clearly state to use the stairs or elevator and which floor they are going to.
      - Combine consecutive movements through corridors into a single instruction like "Proceed down the corridor."
      - The start and end points are the most important.

      Here is the building data for context:
      Levels: ${JSON.stringify(campusData.levels.map(l => ({ id: l.id, name: l.name })))}
    `;

    const contents = `
      Generate navigation instructions for the following path, which is a list of unit names and types in order:
      ${pathUnits.map(unit => `- ${unit.name} (Type: ${unit.type}, Level: ${campusData.levels.find(l => l.id === unit.levelId)?.name})`).join('\n')}
      
      Provide the output as a numbered list.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
            systemInstruction
        }
      });
      return response.text;
    } catch (error) {
      console.error("Error generating navigation instructions:", error);
      return "Could not generate AI-powered instructions. Please follow the path on the map.";
    }
  },
};

import type { CampusData, Unit } from '../types';

// --- Ollama Configuration ---
// Calls go through the Vite proxy (/ollama-api → localhost:11434)
// This avoids all browser CORS issues.
// To change model, update OLLAMA_MODEL below.
const OLLAMA_BASE_URL = '/ollama-api';
const OLLAMA_MODEL = 'llama3.2';

async function isOllamaAvailable(): Promise<boolean> {
    try {
        const resp = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
        return resp.ok;
    } catch {
        return false;
    }
}

export const navigationService = {
    async generateInstructions(path: string[], campusData: CampusData): Promise<string> {
        if (!path || path.length < 2) {
            return "No path to generate instructions for.";
        }

        const available = await isOllamaAvailable();
        if (!available) {
            return "⚠️ Ollama is not running. Start it with `ollama serve` and make sure you have pulled a model: `ollama pull llama3.2`. Follow the path highlighted on the map.";
        }

        const pathUnits = path
            .map(id => campusData.units.find(u => u.id === id))
            .filter((u): u is Unit => !!u);

        const prompt = `You are an indoor navigation assistant. Generate clear, numbered, step-by-step navigation instructions for the following path through a campus building.

Building levels: ${JSON.stringify(campusData.levels.map(l => ({ id: l.id, name: l.name })))}

Path (in order):
${pathUnits.map(unit => `- ${unit.name} (Type: ${unit.type}, Level: ${campusData.levels.find(l => l.id === unit.levelId)?.name ?? 'Unknown'})`).join('\n')}

Rules:
- Combine consecutive corridor movements into one step.
- Clearly state when to use stairs or elevator and which floor to go to.
- Use "Enter [Room Name]" when arriving at a destination room.
- Be concise. Output only the numbered list, no preamble.`;

        try {
            const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    prompt,
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama responded with status ${response.status}`);
            }

            const data = await response.json();
            return data.response ?? "No instructions returned by model.";
        } catch (error) {
            console.error("Error generating navigation instructions via Ollama:", error);
            return "Could not generate AI-powered instructions. Please follow the path highlighted on the map.";
        }
    },
};

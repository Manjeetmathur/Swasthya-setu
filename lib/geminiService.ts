import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY

if (!API_KEY) {
  throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set in environment variables')
}

const genAI = new GoogleGenerativeAI(API_KEY)

export interface MedicalResponse {
  response: string
  suggestions?: MedicineSuggestion[]
}

export interface MedicineSuggestion {
  name: string
  description: string
  usage: string
}

class GeminiMedicalService {
  // Try Gemini 2.0 Flash, fallback to 1.5 Flash if not available
  private getModel() {
    // Try different model names in order of preference
    const models = [
      'gemini-2.0-flash-exp', // Experimental version
      'gemini-2.0-flash',      // Stable version
      'gemini-1.5-flash',      // Fallback to stable 1.5 Flash
      'gemini-1.5-pro'         // Last resort fallback
    ]
    
    // Return model configuration - actual availability will be checked when used
    return genAI.getGenerativeModel({ 
      model: models[0], // Start with the first one
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 500, // Reduced to keep responses concise
      }
    })
  }
  
  private model = this.getModel()
  
  // Helper to try different models if one fails
  private async tryGenerateContent(prompt: string, retryCount = 0): Promise<any> {
    const models = [
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ]
    
    try {
      const modelToUse = models[retryCount] || models[models.length - 1]
      const model = genAI.getGenerativeModel({ 
        model: modelToUse,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 500,
        }
      })
      
      return await model.generateContent(prompt)
    } catch (error: any) {
      // If we have more models to try, retry with next model
      if (retryCount < models.length - 1) {
        console.log(`Model ${models[retryCount]} not available, trying ${models[retryCount + 1]}`)
        return this.tryGenerateContent(prompt, retryCount + 1)
      }
      // If all models failed, throw the error
      throw error
    }
  }

  async getMedicalResponse(query: string, mode: 'medicine' | 'symptoms' | 'health-tips' = 'medicine'): Promise<MedicalResponse> {
    try {
      let prompt = ''
      
      if (mode === 'medicine') {
        prompt = `You are a medicine information specialist. Provide concise information about medicines ONLY.

User question: "${query}"

Focus on:
- Medicine name, generic name
- Uses/indications
- Dosage information
- Side effects (key ones only)
- Precautions/warnings
- When to consult a doctor

IMPORTANT: Keep response SHORT (2-4 sentences). Use **bold** for key terms. Be direct and factual.

If the question is not about a specific medicine, guide them to ask about a medicine name.

End with: "**Note:** This is educational only. Consult a doctor before taking any medicine."`
        
      } else if (mode === 'symptoms') {
        prompt = `You are a symptoms assessment assistant. Help users understand their symptoms.

User question: "${query}"

Focus on:
- What the symptoms might indicate (possible causes)
- When to seek immediate medical attention
- General guidance (NOT diagnosis)
- Self-care tips if appropriate
- Urgency level (mild/moderate/urgent)

IMPORTANT: Keep response SHORT (2-3 sentences). Use **bold** for urgent warnings. NEVER diagnose - only provide guidance.

Always emphasize: "**Important:** This is not a diagnosis. See a doctor for proper evaluation."

End with: "**Note:** For accurate diagnosis, please consult a healthcare professional."`
        
      } else if (mode === 'health-tips') {
        prompt = `You are a wellness and health tips advisor. Provide helpful health tips and wellness advice.

User question: "${query}"

Focus on:
- General health and wellness tips
- Preventive care advice
- Lifestyle recommendations
- Nutrition guidance
- Exercise/fitness tips
- Mental health wellness

IMPORTANT: Keep response SHORT (2-4 sentences). Use **bold** for important points. Be encouraging and practical.

Keep it practical, actionable, and easy to understand.

End with: "**Note:** These are general tips. Consult a healthcare professional for personalized advice."`
      }

      if (!prompt) {
        throw new Error('Invalid mode specified')
      }

      // Try generating content with fallback models
      const result = await this.tryGenerateContent(prompt)
      const response = result.response
      const text = response.text()

      // Return the response from Gemini directly - it will handle filtering appropriately
      // Generate medicine suggestions only in medicine mode
      const suggestions = mode === 'medicine' 
        ? await this.generateMedicineSuggestions(query, text)
        : []

      return {
        response: text,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      }

    } catch (error: any) {
      console.error('Gemini API Error:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        response: error?.response
      })
      
      // More helpful error messages
      if (error?.message?.includes('model') || error?.message?.includes('not found')) {
        throw new Error('All Gemini models are unavailable. Please check your API key and ensure you have access to at least one Gemini model (gemini-1.5-flash or gemini-1.5-pro).')
      }
      if (error?.message?.includes('API key') || error?.status === 401) {
        throw new Error('Invalid API key. Please check your EXPO_PUBLIC_GEMINI_API_KEY.')
      }
      
      throw new Error(`Failed to get response: ${error?.message || 'Unknown error'}`)
    }
  }

  private async generateMedicineSuggestions(query: string, response: string): Promise<MedicineSuggestion[]> {
    try {
      // Only generate suggestions if the query seems to be asking about treatment or medicine recommendations
      const lowerQuery = query.toLowerCase()
      const needsSuggestions = 
        lowerQuery.includes('medicine') || 
        lowerQuery.includes('medication') || 
        lowerQuery.includes('drug') || 
        lowerQuery.includes('treatment') || 
        lowerQuery.includes('what to take') ||
        lowerQuery.includes('suggest') ||
        lowerQuery.includes('recommend') ||
        lowerQuery.includes('help with') ||
        lowerQuery.includes('cure') ||
        lowerQuery.includes('relief')

      if (!needsSuggestions) {
        return []
      }

      // Use AI to generate relevant medicine suggestions based on the query and response
      const suggestionPrompt = `Based on the following medical query and response, provide 2-4 relevant medicine suggestions in JSON format. Only suggest medicines if appropriate for the condition mentioned.

Query: ${query}

Response: ${response}

Provide suggestions in this exact JSON format (array of objects):
[
  {
    "name": "Medicine Name",
    "description": "Brief description of what it does",
    "usage": "Dosage and frequency information"
  }
]

If no medicines are appropriate, return an empty array: []

IMPORTANT:
- Only suggest common, over-the-counter medicines when appropriate
- Include dosage information
- Be specific and accurate
- Return ONLY valid JSON, no additional text
`

      const suggestionResult = await this.tryGenerateContent(suggestionPrompt)
      const suggestionText = suggestionResult.response.text()

      // Try to parse JSON from the response
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = suggestionText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || suggestionText.match(/\[[\s\S]*\]/)
        const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : suggestionText.trim()
        
        // Remove any leading/trailing text that's not JSON
        const cleanJson = jsonString.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '')
        
        const suggestions = JSON.parse(cleanJson)
        
        // Validate and return suggestions
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          return suggestions.filter((s: any) => 
            s.name && s.description && s.usage
          ).slice(0, 4) as MedicineSuggestion[]
        }
      } catch (parseError) {
        console.log('Could not parse AI suggestions:', parseError)
      }

      return []
    } catch (error) {
      console.error('Error generating medicine suggestions:', error)
      return []
    }
  }

  isMedicalQuery(query: string): boolean {
    const medicalKeywords = [
      'medicine', 'medication', 'drug', 'tablet', 'capsule', 'syrup', 'injection',
      'dose', 'dosage', 'side effect', 'symptom', 'disease', 'illness', 'treatment',
      'cure', 'therapy', 'prescription', 'pharmacy', 'doctor', 'health', 'medical',
      'pain', 'fever', 'headache', 'cold', 'cough', 'infection', 'antibiotic',
      'vitamin', 'supplement', 'allergy', 'diabetes', 'blood pressure', 'heart',
      'stomach', 'liver', 'kidney', 'brain', 'cancer', 'surgery', 'hospital',
      'paracetamol', 'ibuprofen', 'aspirin', 'flu', 'covid', 'vaccine', 'immunity'
    ]
    
    const lowerQuery = query.toLowerCase()
    return medicalKeywords.some(keyword => lowerQuery.includes(keyword))
  }
}

export const geminiMedicalService = new GeminiMedicalService()
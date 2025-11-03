import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY

if (!API_KEY) {
  console.warn('EXPO_PUBLIC_GEMINI_API_KEY not set. Skin Rash analysis will be limited.')
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null

export interface RashAnalysis {
  condition: string
  severity: 'mild' | 'moderate' | 'severe'
  description: string
  possibleCauses: string[]
  recommendations: string[]
  urgency: 'low' | 'medium' | 'high'
  whenToSeeDoctor: string[]
  symptoms: string[]
}

export interface SkinRashResult {
  analysis: RashAnalysis
  extractedText?: string
  confidence: number
}

class SkinRashService {
  private getModel(modelName?: string) {
    if (!genAI) {
      throw new Error('Gemini API key not configured')
    }

    const models = modelName ? [modelName] : [
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro'
    ]

    return genAI.getGenerativeModel({
      model: models[0],
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2000
      }
    })
  }

  /**
   * Analyze skin rash image using Gemini Vision
   */
  async analyzeRashImage(imageBase64: string): Promise<SkinRashResult> {
    if (!genAI) {
      throw new Error('Gemini API key not configured')
    }

    try {
      const base64Data = imageBase64.includes(',') 
        ? imageBase64.split(',')[1] 
        : imageBase64

      const model = this.getModel('gemini-2.0-flash-exp')
      const prompt = this.buildRashAnalysisPrompt()

      const result = await this.generateContentWithRetry(model, [
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg'
          }
        },
        prompt
      ], 2)

      const responseText = result.response.text()
      return this.parseAIResponse(responseText)
    } catch (error: any) {
      console.error('Skin Rash analysis error:', error)
      if (error.message?.includes('429') || error.message?.includes('Resource exhausted')) {
        throw new Error('API rate limit reached. Please wait a moment and try again.')
      }
      throw new Error(`Failed to analyze skin rash: ${error.message}`)
    }
  }

  /**
   * Build analysis prompt for skin rash detection
   */
  private buildRashAnalysisPrompt(): string {
    return `You are a medical AI assistant specializing in dermatology. Analyze this skin image and provide a detailed assessment.

CRITICAL INSTRUCTIONS:
- Analyze the visible skin condition, rash, or lesion
- Identify potential conditions based on appearance, color, texture, and distribution
- Assess severity (mild, moderate, severe)
- Provide evidence-based medical information
- If the condition is unclear, provide general guidance
- ALWAYS recommend consulting a healthcare professional for accurate diagnosis

Return your response as a valid JSON object with this exact structure:
{
  "condition": "string (e.g., 'Contact Dermatitis', 'Eczema', 'Psoriasis', 'Unknown Rash')",
  "severity": "mild | moderate | severe",
  "description": "Detailed description of what you observe",
  "possibleCauses": ["array of possible causes"],
  "recommendations": ["array of recommended actions/treatments"],
  "urgency": "low | medium | high",
  "whenToSeeDoctor": ["array of warning signs that require immediate medical attention"],
  "symptoms": ["array of symptoms you observe in the image"]
}

MANDATORY RULES:
- Provide at least 3-5 items for possibleCauses, recommendations, and whenToSeeDoctor
- Use medical terminology appropriately
- Include general first-aid recommendations if applicable
- Return ONLY valid JSON, no markdown formatting or additional text`
  }

  /**
   * Parse AI response into structured result
   */
  private parseAIResponse(responseText: string): SkinRashResult {
    try {
      let jsonText = responseText.trim()
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')

      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      const analysis: RashAnalysis = {
        condition: parsed.condition || 'Unknown Rash',
        severity: parsed.severity || 'mild',
        description: parsed.description || 'Unable to analyze image clearly',
        possibleCauses: Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        urgency: parsed.urgency || 'low',
        whenToSeeDoctor: Array.isArray(parsed.whenToSeeDoctor) ? parsed.whenToSeeDoctor : [],
        symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : []
      }

      return {
        analysis,
        confidence: parsed.confidence || 0.7,
        extractedText: parsed.extractedText || ''
      }
    } catch (error) {
      console.error('Error parsing AI response:', error)
      // Return fallback result
      return {
        analysis: {
          condition: 'Unknown Rash',
          severity: 'mild',
          description: 'Unable to analyze the image. Please ensure the image is clear and shows the affected area.',
          possibleCauses: ['Image quality may be insufficient', 'Lighting conditions may affect analysis'],
          recommendations: [
            'Take a clearer photo with good lighting',
            'Consult a dermatologist for accurate diagnosis',
            'Keep the area clean and dry'
          ],
          urgency: 'low',
          whenToSeeDoctor: [
            'If the rash spreads rapidly',
            'If you experience fever or other symptoms',
            'If the condition worsens'
          ],
          symptoms: []
        },
        confidence: 0.3
      }
    }
  }

  /**
   * Retry mechanism with exponential backoff
   */
  private async generateContentWithRetry(
    model: any,
    content: any[],
    maxRetries: number = 3
  ): Promise<any> {
    let lastError: any = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await model.generateContent(content)
      } catch (error: any) {
        lastError = error
        
        if (error.message?.includes('429') || error.message?.includes('Resource exhausted')) {
          if (attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000
            console.log(`Rate limit hit, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
        }
        throw error
      }
    }
    throw lastError
  }

  /**
   * Translate skin rash result to Hindi
   */
  async translateToHindi(result: SkinRashResult): Promise<SkinRashResult> {
    if (!genAI) {
      throw new Error('Gemini API key not configured')
    }

    try {
      const model = this.getModel('gemini-2.0-flash-exp')
      
      const translationPrompt = `Translate this skin rash analysis to Hindi (Devanagari script). Keep the structure and return JSON.

Original English:
{
  "condition": "${result.analysis.condition}",
  "severity": "${result.analysis.severity}",
  "description": "${result.analysis.description}",
  "possibleCauses": ${JSON.stringify(result.analysis.possibleCauses)},
  "recommendations": ${JSON.stringify(result.analysis.recommendations)},
  "urgency": "${result.analysis.urgency}",
  "whenToSeeDoctor": ${JSON.stringify(result.analysis.whenToSeeDoctor)},
  "symptoms": ${JSON.stringify(result.analysis.symptoms)}
}

Translate ALL text to Hindi. Return ONLY valid JSON with the same structure, all text in Hindi (Devanagari script).`
      
      const result_translated = await this.generateContentWithRetry(model, [translationPrompt], 2)
      const response = result_translated.response
      const translatedText = response.text()
      
      return this.parseTranslatedResponse(translatedText, result)
    } catch (error: any) {
      console.error('Translation error:', error)
      return result
    }
  }

  /**
   * Parse translated response
   */
  private parseTranslatedResponse(translatedText: string, originalResult: SkinRashResult): SkinRashResult {
    try {
      let jsonText = translatedText.trim()
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return originalResult
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        ...originalResult,
        analysis: {
          condition: parsed.condition || originalResult.analysis.condition,
          severity: parsed.severity || originalResult.analysis.severity,
          description: parsed.description || originalResult.analysis.description,
          possibleCauses: parsed.possibleCauses || originalResult.analysis.possibleCauses,
          recommendations: parsed.recommendations || originalResult.analysis.recommendations,
          urgency: parsed.urgency || originalResult.analysis.urgency,
          whenToSeeDoctor: parsed.whenToSeeDoctor || originalResult.analysis.whenToSeeDoctor,
          symptoms: parsed.symptoms || originalResult.analysis.symptoms
        }
      }
    } catch (error) {
      console.error('Error parsing translated response:', error)
      return originalResult
    }
  }
}

export const skinRashService = new SkinRashService()


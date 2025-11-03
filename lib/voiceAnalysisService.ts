import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY

if (!API_KEY) {
  console.warn('EXPO_PUBLIC_GEMINI_API_KEY not set. Voice analysis will be limited.')
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null

export interface VoiceAnalysis {
  score: number // 0-100 (100 = happy, <40 = alert)
  tone: 'happy' | 'neutral' | 'sad' | 'flat'
  energy: 'high' | 'medium' | 'low'
  indicators: {
    slowSpeech: boolean
    flatTone: boolean
    pauses: boolean
    lowVolume: boolean
  }
  detectedMood: string
  confidence: number
}

class VoiceAnalysisService {
  private getModel() {
    if (!genAI) {
      throw new Error('Gemini API key not configured')
    }

    return genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 500
      }
    })
  }

  /**
   * Analyze voice recording for mood detection
   * Note: Gemini doesn't directly process audio, so we'll use text transcription first
   * For real implementation, use a speech-to-text service, then analyze
   */
  async analyzeVoice(
    audioBase64: string,
    transcription?: string
  ): Promise<VoiceAnalysis> {
    if (!genAI) {
      throw new Error('Gemini API key not configured')
    }

    try {
      // For now, we'll analyze based on transcription if provided
      // In production, you'd use a speech-to-text service first
      const prompt = this.buildAnalysisPrompt(transcription || 'No transcription available')

      const model = this.getModel()
      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      // Parse AI response
      return this.parseAnalysisResponse(text)
    } catch (error: any) {
      console.error('Voice analysis error:', error)
      
      // Fallback: basic analysis based on audio metadata
      return this.getFallbackAnalysis()
    }
  }

  /**
   * Analyze voice based on transcription text
   * This is a simpler approach - analyze what was said
   */
  async analyzeTranscription(transcription: string): Promise<VoiceAnalysis> {
    if (!genAI) {
      throw new Error('Gemini API key not configured')
    }

    try {
      const prompt = this.buildAnalysisPrompt(transcription)

      const model = this.getModel()
      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      return this.parseAnalysisResponse(text)
    } catch (error: any) {
      console.error('Transcription analysis error:', error)
      return this.getFallbackAnalysis()
    }
  }

  /**
   * Build analysis prompt for Gemini
   */
  private buildAnalysisPrompt(transcription: string): string {
    return `You are a mental health AI analyzing voice/text for depression indicators.

User said: "${transcription}"

Analyze the following indicators:
1. Slow speech (low energy)
2. Flat tone (lack of emotion)
3. Pauses (hesitation, difficulty speaking)
4. Low volume (withdrawn)

Return ONLY valid JSON, no markdown:

{
  "score": 65,
  "tone": "neutral",
  "energy": "medium",
  "indicators": {
    "slowSpeech": false,
    "flatTone": true,
    "pauses": true,
    "lowVolume": false
  },
  "detectedMood": "Feeling tired or low energy",
  "confidence": 0.75
}

SCORING GUIDE:
- 80-100: Happy, energetic, positive
- 60-79: Neutral, okay
- 40-59: Low mood, tired, sad
- 0-39: Very low, concerning, depressed

TONE VALUES: "happy", "neutral", "sad", "flat"
ENERGY VALUES: "high", "medium", "low"

Return ONLY the JSON object.`
  }

  /**
   * Parse AI response into structured analysis
   */
  private parseAnalysisResponse(text: string): VoiceAnalysis {
    try {
      // Extract JSON from response
      let jsonText = text.trim()
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        score: Math.max(0, Math.min(100, parsed.score || 70)),
        tone: parsed.tone || 'neutral',
        energy: parsed.energy || 'medium',
        indicators: {
          slowSpeech: parsed.indicators?.slowSpeech || false,
          flatTone: parsed.indicators?.flatTone || false,
          pauses: parsed.indicators?.pauses || false,
          lowVolume: parsed.indicators?.lowVolume || false
        },
        detectedMood: parsed.detectedMood || 'Neutral',
        confidence: parsed.confidence || 0.5
      }
    } catch (error: any) {
      console.error('Error parsing analysis response:', error)
      return this.getFallbackAnalysis()
    }
  }

  /**
   * Fallback analysis when AI fails
   */
  private getFallbackAnalysis(): VoiceAnalysis {
    return {
      score: 70,
      tone: 'neutral',
      energy: 'medium',
      indicators: {
        slowSpeech: false,
        flatTone: false,
        pauses: false,
        lowVolume: false
      },
      detectedMood: 'Unable to analyze',
      confidence: 0.3
    }
  }

  /**
   * Simple heuristic-based analysis (fallback)
   * Checks for common depression indicators in text
   */
  analyzeTextHeuristics(text: string): Partial<VoiceAnalysis> {
    const lowerText = text.toLowerCase()
    
    // Negative indicators
    const negativeWords = ['tired', 'exhausted', 'sad', 'depressed', 'lonely', 'hopeless', 'empty', 'worthless', 'guilty']
    const lowEnergyWords = ['can\'t', 'can\'t', 'don\'t want', 'don\'t feel', 'barely', 'hardly']
    
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length
    const lowEnergyCount = lowEnergyWords.filter(word => lowerText.includes(word)).length
    
    // Calculate score
    let score = 70
    score -= negativeCount * 10
    score -= lowEnergyCount * 5
    score = Math.max(0, Math.min(100, score))
    
    return {
      score,
      tone: score < 40 ? 'sad' : score < 60 ? 'flat' : 'neutral',
      energy: score < 40 ? 'low' : score < 60 ? 'medium' : 'medium',
      indicators: {
        slowSpeech: lowEnergyCount > 0,
        flatTone: negativeCount > 0,
        pauses: false,
        lowVolume: false
      }
    }
  }
}

export const voiceAnalysisService = new VoiceAnalysisService()


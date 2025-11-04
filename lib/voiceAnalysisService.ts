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

export interface MentalHealthSuggestion {
  title: string
  description: string
  category: 'self-care' | 'activity' | 'professional' | 'immediate'
}

class VoiceAnalysisService {
  private getModel() {
    if (!genAI) {
      throw new Error('Gemini API key not configured')
    }

    return genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
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

  /**
   * Generate personalized mental health suggestions based on voice analysis
   */
  async generateSuggestions(analysis: VoiceAnalysis, transcription?: string): Promise<MentalHealthSuggestion[]> {
    if (!genAI) {
      // Return fallback suggestions if API not available
      return this.getFallbackSuggestions(analysis)
    }

    try {
      const model = this.getModel()
      
      const prompt = `You are a mental health AI assistant. Based on the following voice analysis, provide 3-5 personalized, actionable suggestions to help improve mood and mental wellbeing.

Analysis Results:
- Mood Score: ${analysis.score}/100
- Tone: ${analysis.tone}
- Energy Level: ${analysis.energy}
- Detected Mood: ${analysis.detectedMood}
${transcription ? `- What they said: "${transcription}"` : ''}
- Indicators: ${Object.entries(analysis.indicators).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'None detected'}

Return ONLY valid JSON array (no markdown), with this exact structure:
[
  {
    "title": "Short actionable title",
    "description": "Brief explanation of why this helps and how to do it",
    "category": "self-care" | "activity" | "professional" | "immediate"
  }
]

GUIDELINES:
- For score < 40: Include immediate help and professional support suggestions
- For score 40-59: Focus on self-care and gentle activities
- For score 60-79: Suggest maintaining positive habits
- For score 80+: Suggest ways to maintain and enhance wellbeing
- Make suggestions specific, practical, and actionable
- Be empathetic and supportive
- Include at least one professional help suggestion if score < 50

Return ONLY the JSON array, no additional text.`

      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      // Parse JSON response
      let jsonText = text.trim()
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        return this.getFallbackSuggestions(analysis)
      }

      const suggestions = JSON.parse(jsonMatch[0]) as MentalHealthSuggestion[]
      return suggestions.filter(s => s.title && s.description).slice(0, 5)
    } catch (error: any) {
      console.error('Error generating suggestions:', error)
      return this.getFallbackSuggestions(analysis)
    }
  }

  /**
   * Fallback suggestions when AI is not available
   */
  private getFallbackSuggestions(analysis: VoiceAnalysis): MentalHealthSuggestion[] {
    const score = analysis.score ?? 65
    
    if (score < 40) {
      return [
        {
          title: 'Connect with a Professional',
          description: 'Consider speaking with a mental health professional or therapist. Support is available.',
          category: 'immediate'
        },
        {
          title: 'Practice Deep Breathing',
          description: 'Take 5 deep breaths: inhale for 4 counts, hold for 4, exhale for 4. This can help calm your nervous system.',
          category: 'self-care'
        },
        {
          title: 'Reach Out to Someone',
          description: 'Talk to a friend, family member, or support line. You don\'t have to go through this alone.',
          category: 'immediate'
        },
        {
          title: 'Gentle Movement',
          description: 'Take a short walk or do light stretching. Even 5 minutes can help boost your mood.',
          category: 'activity'
        }
      ]
    } else if (score < 60) {
      return [
        {
          title: 'Get Some Fresh Air',
          description: 'Step outside for 10 minutes. Sunlight and fresh air can naturally improve your mood.',
          category: 'activity'
        },
        {
          title: 'Practice Gratitude',
          description: 'Write down 3 things you\'re grateful for today, no matter how small.',
          category: 'self-care'
        },
        {
          title: 'Listen to Uplifting Music',
          description: 'Play your favorite upbeat songs. Music can positively affect your mood and energy.',
          category: 'activity'
        },
        {
          title: 'Stay Hydrated',
          description: 'Drink a glass of water. Dehydration can affect mood and energy levels.',
          category: 'self-care'
        }
      ]
    } else if (score < 80) {
      return [
        {
          title: 'Maintain Your Routine',
          description: 'Keep up with your positive habits. Consistency helps maintain good mental health.',
          category: 'self-care'
        },
        {
          title: 'Connect with Others',
          description: 'Spend time with people who make you feel good. Social connection is important.',
          category: 'activity'
        },
        {
          title: 'Practice Mindfulness',
          description: 'Take a moment to be present. Notice your surroundings and how you feel right now.',
          category: 'self-care'
        }
      ]
    } else {
      return [
        {
          title: 'Keep Up the Great Work',
          description: 'You\'re doing well! Continue maintaining your positive habits and self-care routines.',
          category: 'self-care'
        },
        {
          title: 'Share Your Positivity',
          description: 'Your positive energy can help others. Consider reaching out to someone who might need support.',
          category: 'activity'
        },
        {
          title: 'Explore New Activities',
          description: 'Try something new you\'ve been curious about. Growth and learning support wellbeing.',
          category: 'activity'
        }
      ]
    }
  }
}

export const voiceAnalysisService = new VoiceAnalysisService()


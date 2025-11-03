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
  private model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' })

  async getMedicalResponse(query: string): Promise<MedicalResponse> {
    try {
      const prompt = `You are a medical AI assistant. Please provide accurate medical information about the following query. 
      
      IMPORTANT GUIDELINES:
      1. Only answer medical and health-related questions
      2. Always include a disclaimer that this is for educational purposes only
      3. Recommend consulting healthcare professionals for serious concerns
      4. Provide clear, accurate information about medicines, symptoms, and treatments
      5. If asked about specific medicines, include: uses, dosage guidelines, side effects, and precautions
      6. Format your response clearly with proper sections
      
      Query: ${query}
      
      If this is not a medical question, respond with: "I can only help with medical and health-related questions. Please ask about medicines, symptoms, treatments, or general health information."
      
      Always end medical responses with: "**Note:** This information is for educational purposes only and not a substitute for professional medical advice. Please consult a healthcare professional for personalized treatment."
      `

      const result = await this.model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      // Check if it's a non-medical query response
      if (text.includes('I can only help with medical and health-related questions')) {
        return {
          response: 'I can only help with medical and health-related questions. Please ask about medicines, symptoms, treatments, or general health information.'
        }
      }

      // Generate medicine suggestions based on the query
      const suggestions = this.generateMedicineSuggestions(query)

      return {
        response: text,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      }

    } catch (error) {
      console.error('Gemini API Error:', error)
      throw new Error('Failed to get medical information. Please try again.')
    }
  }

  private generateMedicineSuggestions(query: string): MedicineSuggestion[] {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('headache') || lowerQuery.includes('pain')) {
      return [
        { name: 'Paracetamol', description: 'Pain reliever and fever reducer', usage: '500mg every 4-6 hours' },
        { name: 'Ibuprofen', description: 'Anti-inflammatory pain reliever', usage: '200-400mg every 4-6 hours' },
        { name: 'Aspirin', description: 'Pain reliever and blood thinner', usage: '325-650mg every 4 hours' }
      ]
    }
    
    if (lowerQuery.includes('fever')) {
      return [
        { name: 'Paracetamol', description: 'Effective fever reducer', usage: '500-1000mg every 4-6 hours' },
        { name: 'Ibuprofen', description: 'Reduces fever and inflammation', usage: '200-400mg every 4-6 hours' }
      ]
    }
    
    if (lowerQuery.includes('cough')) {
      return [
        { name: 'Dextromethorphan', description: 'Dry cough suppressant', usage: '15-30mg every 4 hours' },
        { name: 'Guaifenesin', description: 'Expectorant for wet cough', usage: '200-400mg every 4 hours' },
        { name: 'Honey', description: 'Natural cough remedy', usage: '1-2 teaspoons as needed' }
      ]
    }

    if (lowerQuery.includes('cold') || lowerQuery.includes('flu')) {
      return [
        { name: 'Paracetamol', description: 'For fever and body aches', usage: '500mg every 4-6 hours' },
        { name: 'Phenylephrine', description: 'Nasal decongestant', usage: '10mg every 4 hours' },
        { name: 'Loratadine', description: 'Antihistamine for runny nose', usage: '10mg once daily' }
      ]
    }

    if (lowerQuery.includes('stomach') || lowerQuery.includes('acidity') || lowerQuery.includes('heartburn')) {
      return [
        { name: 'Omeprazole', description: 'Proton pump inhibitor for acidity', usage: '20mg once daily before meals' },
        { name: 'Ranitidine', description: 'H2 blocker for heartburn', usage: '150mg twice daily' },
        { name: 'Antacid', description: 'Quick relief from acidity', usage: '1-2 tablets after meals' }
      ]
    }
    
    return []
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
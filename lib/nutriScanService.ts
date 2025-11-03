import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY

if (!API_KEY) {
  console.warn('EXPO_PUBLIC_GEMINI_API_KEY not set. AIScan analysis will be limited.')
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null

export interface AllergyAlert {
  allergen: string
  severity: 'high' | 'medium' | 'low'
  found: boolean
}

export interface NutritionScore {
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  score: number // 0-100
  reasons: string[]
}

export interface MedicineInfo {
  name: string
  genericName?: string
  uses: string[]
  indications: string[]
  sideEffects: string[]
  contraindications: string[]
  dosage: string
  precautions: string[]
  interactions?: string[]
  results: string // Expected results/outcomes
}

export interface ScanResult {
  scanType: 'food' | 'medicine'
  // Food-specific
  ingredients: string[]
  allergens: AllergyAlert[]
  nutritionScore: NutritionScore
  safeAlternatives: string[]
  // Medicine-specific
  medicineInfo?: MedicineInfo
  // Common
  warnings: string[]
  isSafe: boolean
  extractedText: string
}

export interface UserProfile {
  allergies?: string[]
  dietaryRestrictions?: 'vegan' | 'vegetarian' | 'diabetic' | 'none'
  healthConditions?: string[]
}

class NutriScanService {
  private getModel(modelName?: string) {
    if (!genAI) {
      throw new Error('Gemini API key not configured')
    }

    // Try different models in order of preference
    const models = modelName ? [modelName] : [
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
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
   * Analyze food label image using Gemini Vision
   * @param imageBase64 - Base64 encoded image (from expo-image-picker)
   */
  async analyzeLabelImage(
    imageBase64: string,
    userProfile?: UserProfile
  ): Promise<ScanResult> {
    if (!genAI) {
      throw new Error('Gemini API key not configured')
    }

    try {
      // Remove data URL prefix if present
      const base64Data = imageBase64.includes(',') 
        ? imageBase64.split(',')[1] 
        : imageBase64

      // Create prompt for analysis
      const allergies = userProfile?.allergies || []
      const restrictions = userProfile?.dietaryRestrictions || 'none'
      const conditions = userProfile?.healthConditions || []

      // Use a single model instance
      let model = this.getModel('gemini-2.0-flash') // Use 2.0-flash model
      let parsedResult: ScanResult | null = null

      try {
        // Try medicine analysis first
        const medicinePrompt = this.buildMedicineAnalysisPrompt()
        const medicineResult = await this.generateContentWithRetry(model, [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg'
            }
          },
          medicinePrompt
        ], 2) // Only 2 retries for medicine

        const medicineText = medicineResult.response.text()
        parsedResult = this.parseAIResponse(medicineText, allergies, restrictions, true)
        
        // Check if we got valid medicine info
        if (parsedResult.medicineInfo && 
            parsedResult.medicineInfo.name && 
            parsedResult.medicineInfo.name !== 'Unknown Medicine' &&
            (parsedResult.medicineInfo.uses.length > 0 || parsedResult.medicineInfo.sideEffects.length > 0)) {
          return parsedResult
        }
      } catch (error: any) {
        // If rate limited, try with food analysis (might be food item)
        if (error.message?.includes('429') || error.message?.includes('Resource exhausted')) {
          console.log('Rate limit on medicine analysis, trying food analysis...')
        } else {
          console.log('Medicine analysis failed, trying food analysis...', error)
        }
      }

      // Fallback to food analysis
      try {
        const foodPrompt = this.buildFoodAnalysisPrompt(allergies, restrictions, conditions)
        const foodResult = await this.generateContentWithRetry(model, [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg'
            }
          },
          foodPrompt
        ], 2) // Only 2 retries for food

        const foodText = foodResult.response.text()
        parsedResult = this.parseAIResponse(foodText, allergies, restrictions, false)
        return parsedResult
      } catch (error: any) {
        console.error('Food analysis also failed:', error)
        // Return fallback medicine result if we have partial data
        if (parsedResult && parsedResult.medicineInfo) {
          return parsedResult
        }
        // If rate limited, provide helpful error
        if (error.message?.includes('429') || error.message?.includes('Resource exhausted')) {
          throw new Error('API rate limit reached. Please wait a moment and try again.')
        }
        throw new Error(`Failed to analyze: ${error.message}`)
      }
    } catch (error: any) {
      console.error('AIScan analysis error:', error)
      throw new Error(`Failed to analyze label: ${error.message}`)
    }
  }

  /**
   * Build medicine analysis prompt
   */
  private buildMedicineAnalysisPrompt(): string {
    return `You are a medical information AI analyzing a medicine packet/prescription. Extract ALL information from the image.

CRITICAL: You MUST provide comprehensive information. If information is not visible on the packet, use your medical knowledge to provide common/typical information for that medicine type.

IMPORTANT: Return ONLY valid JSON, no additional text or markdown formatting.

Analyze the medicine packet and return a JSON object with this exact structure:

{
  "scanType": "medicine",
  "extractedText": "Full text extracted from the packet",
  "medicineInfo": {
    "name": "Brand name of medicine",
    "genericName": "Generic/chemical name",
    "uses": ["Use 1", "Use 2", "Use 3"],
    "indications": ["Indication 1", "Indication 2"],
    "sideEffects": ["Side effect 1", "Side effect 2", "Side effect 3"],
    "contraindications": ["Who should not take this", "Conditions to avoid"],
    "dosage": "Recommended dosage information",
    "precautions": ["Precaution 1", "Precaution 2"],
    "interactions": ["Drug interaction 1", "Drug interaction 2"],
    "results": "Expected results/outcomes when taking this medicine"
  },
  "warnings": ["Warning 1", "Warning 2"],
  "isSafe": true,
  "ingredients": [],
  "allergens": [],
  "nutritionScore": null,
  "safeAlternatives": []
}

MANDATORY RULES:
1. ALWAYS extract medicine name (brand name) - if not visible, use "Unknown Medicine"
2. ALWAYS provide at least 3-5 uses/indications - what conditions this medicine treats. If not visible, provide common uses for this type of medicine based on the name/ingredients.
3. ALWAYS provide at least 3-5 side effects - common side effects for this medicine type. Common side effects include: nausea, dizziness, headache, drowsiness, stomach upset, allergic reactions.
4. ALWAYS provide contraindications - who should not take it (pregnant women, children, people with certain conditions). If not visible, provide common contraindications.
5. ALWAYS extract dosage information - if not visible, provide typical dosage for this medicine type.
6. ALWAYS provide at least 2-3 precautions - safety warnings (take with food, avoid alcohol, etc.)
7. ALWAYS mention drug interactions - common interactions with other medicines if any.
8. ALWAYS describe expected results/outcomes - what happens when taking this medicine (symptom relief, treatment effects).
9. Include any warnings from the packet.
10. Set isSafe based on whether there are critical warnings.

EXAMPLES:
- If medicine name is "Paracetamol" or "Acetaminophen": uses should include "Fever, Pain relief, Headache"
- If it's an antibiotic: uses should include "Bacterial infections", side effects should include "Nausea, Diarrhea, Allergic reactions"
- If it's an antacid: uses should include "Acid reflux, Heartburn, Stomach upset"

IMPORTANT: Never return empty arrays for uses, sideEffects, or contraindications. Always provide at least 3 items for each, even if using general medical knowledge.

Return ONLY the JSON object, no markdown, no code blocks.`
  }

  /**
   * Generate content with retry logic for rate limits
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
        
        // Check if it's a rate limit error (429)
        if (error.message?.includes('429') || error.message?.includes('Resource exhausted')) {
          if (attempt < maxRetries) {
            // Exponential backoff: wait 2^attempt seconds
            const waitTime = Math.pow(2, attempt) * 1000
            console.log(`Rate limit hit, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
        }
        
        // If it's not a rate limit error or we've exhausted retries, throw
        throw error
      }
    }
    
    throw lastError
  }

  /**
   * Build enhanced medicine prompt for retry (unused now, but kept for reference)
   */
  private buildEnhancedMedicinePrompt(previousText: string): string {
    return `You are a medical information AI. The previous analysis was incomplete. 

Extract comprehensive information from this medicine packet image.

From the image, identify:
1. Medicine name (brand and generic)
2. What it's used for (at least 5 uses/indications)
3. Side effects (at least 5 common side effects)
4. Who should not take it (contraindications)
5. Dosage instructions
6. Precautions
7. Drug interactions
8. Expected results

CRITICAL: If information is not fully visible on the packet, use your medical knowledge to provide comprehensive information for this medicine type.

Return ONLY valid JSON with this structure:
{
  "scanType": "medicine",
  "extractedText": "Full text from packet",
  "medicineInfo": {
    "name": "Medicine name",
    "genericName": "Generic name",
    "uses": ["At least 5 uses"],
    "indications": ["At least 3 indications"],
    "sideEffects": ["At least 5 side effects"],
    "contraindications": ["At least 3 contraindications"],
    "dosage": "Dosage information",
    "precautions": ["At least 3 precautions"],
    "interactions": ["Common interactions"],
    "results": "Expected results"
  },
  "warnings": ["Any warnings"],
  "isSafe": true,
  "ingredients": [],
  "allergens": [],
  "nutritionScore": null,
  "safeAlternatives": []
}

Return ONLY JSON, no markdown.`
  }

  /**
   * Build food analysis prompt for Gemini
   */
  private buildFoodAnalysisPrompt(
    allergies: string[],
    restrictions: string,
    conditions: string[]
  ): string {
    const allergyList = allergies.length > 0 
      ? allergies.map(a => `- ${a}`).join('\n')
      : 'None specified'

    let restrictionNote = ''
    if (restrictions === 'vegan') {
      restrictionNote = '\n- Check for animal products (meat, dairy, eggs, honey, gelatin, etc.)'
    } else if (restrictions === 'vegetarian') {
      restrictionNote = '\n- Check for meat products'
    } else if (restrictions === 'diabetic') {
      restrictionNote = '\n- Check sugar content (avoid if >10g per serving)'
    }

    return `You are a food safety AI analyzing a food product label. Analyze the image and extract ALL information.

IMPORTANT: Return ONLY valid JSON, no additional text or markdown formatting.

Set "scanType": "food" in the response.

User's allergies to check:
${allergyList}

Dietary restrictions: ${restrictions}
${restrictionNote}

Health conditions to consider: ${conditions.join(', ') || 'None'}

Analyze the label and return a JSON object with this exact structure:

{
  "scanType": "food",
  "extractedText": "Full text extracted from the label",
  "ingredients": ["ingredient1", "ingredient2", ...],
  "allergens": [
    {
      "allergen": "Peanuts",
      "severity": "high",
      "found": true
    }
  ],
  "nutritionScore": {
    "grade": "A",
    "score": 85,
    "reasons": ["Reason 1", "Reason 2"]
  },
  "warnings": ["Warning message 1", "Warning message 2"],
  "safeAlternatives": ["Alternative product 1", "Alternative product 2"],
  "isSafe": true,
  "medicineInfo": null
}

RULES:
1. Extract ALL ingredients from the label text
2. Check against user allergies - mark "found": true if allergen is present
3. Set severity: "high" for life-threatening (peanuts, tree nuts, shellfish), "medium" for serious (dairy, eggs), "low" for mild reactions
4. Calculate nutrition score:
   - Grade A (90-100): Excellent, minimal processed ingredients, low sugar/sodium
   - Grade B (80-89): Good, some processed ingredients
   - Grade C (70-79): Moderate, contains some additives
   - Grade D (60-69): Poor, high sugar/sodium/processed
   - Grade F (0-59): Very poor, avoid - high risk ingredients
5. If ANY allergen found, set isSafe: false
6. If restriction violated (vegan/vegetarian/diabetic), set isSafe: false
7. Provide 2-3 safe alternative product suggestions
8. Include specific warnings for high-risk ingredients

Return ONLY the JSON object, no markdown, no code blocks.`
  }

  /**
   * Parse AI response into structured result
   */
  private parseAIResponse(
    text: string,
    userAllergies: string[],
    restrictions: string,
    isMedicine: boolean = false
  ): ScanResult {
    try {
      // Extract JSON from response (remove markdown if present)
      let jsonText = text.trim()
      
      // Remove markdown code blocks
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      // Find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      const scanType = parsed.scanType || (isMedicine ? 'medicine' : 'food')

      // Validate and structure the result
      return {
        scanType,
        ingredients: parsed.ingredients || [],
        allergens: parsed.allergens || [],
        nutritionScore: parsed.nutritionScore ? {
          grade: parsed.nutritionScore.grade || 'C',
          score: parsed.nutritionScore.score || 70,
          reasons: parsed.nutritionScore.reasons || []
        } : {
          grade: 'C',
          score: 70,
          reasons: []
        },
        medicineInfo: parsed.medicineInfo ? {
          name: parsed.medicineInfo.name || 'Unknown Medicine',
          genericName: parsed.medicineInfo.genericName || parsed.medicineInfo.name || '',
          uses: Array.isArray(parsed.medicineInfo.uses) && parsed.medicineInfo.uses.length > 0 
            ? parsed.medicineInfo.uses 
            : this.getFallbackUses(parsed.medicineInfo.name || ''),
          indications: Array.isArray(parsed.medicineInfo.indications) && parsed.medicineInfo.indications.length > 0
            ? parsed.medicineInfo.indications
            : parsed.medicineInfo.uses || [],
          sideEffects: Array.isArray(parsed.medicineInfo.sideEffects) && parsed.medicineInfo.sideEffects.length > 0
            ? parsed.medicineInfo.sideEffects
            : this.getFallbackSideEffects(parsed.medicineInfo.name || ''),
          contraindications: Array.isArray(parsed.medicineInfo.contraindications) && parsed.medicineInfo.contraindications.length > 0
            ? parsed.medicineInfo.contraindications
            : ['Pregnant women', 'Children under 12', 'People with allergies to ingredients'],
          dosage: parsed.medicineInfo.dosage || 'As prescribed by doctor',
          precautions: Array.isArray(parsed.medicineInfo.precautions) && parsed.medicineInfo.precautions.length > 0
            ? parsed.medicineInfo.precautions
            : ['Take with food if stomach upset occurs', 'Avoid alcohol', 'Consult doctor if symptoms persist'],
          interactions: parsed.medicineInfo.interactions || [],
          results: parsed.medicineInfo.results || 'Provides relief from symptoms as indicated'
        } : undefined,
        warnings: parsed.warnings || [],
        safeAlternatives: parsed.safeAlternatives || [],
        isSafe: parsed.isSafe !== false, // Default to true if not specified
        extractedText: parsed.extractedText || ''
      }
    } catch (error: any) {
      console.error('Error parsing AI response:', error)
      
      // Return fallback result
      return {
        scanType: isMedicine ? 'medicine' : 'food',
        ingredients: [],
        allergens: [],
        nutritionScore: {
          grade: 'C',
          score: 70,
          reasons: ['Unable to fully analyze label']
        },
        medicineInfo: isMedicine ? {
          name: 'Unknown',
          uses: [],
          indications: [],
          sideEffects: [],
          contraindications: [],
          dosage: '',
          precautions: [],
          results: ''
        } : undefined,
        warnings: ['Analysis incomplete. Please try again or check manually.'],
        safeAlternatives: [],
        isSafe: true,
        extractedText: text
      }
    }
  }

  /**
   * Quick allergen check (for fast scanning)
   */
  checkAllergens(ingredients: string[], allergens: string[]): AllergyAlert[] {
    const found: AllergyAlert[] = []
    const ingredientText = ingredients.join(' ').toLowerCase()

    allergens.forEach(allergen => {
      const allergenLower = allergen.toLowerCase()
      const foundInText = ingredientText.includes(allergenLower)
      
      if (foundInText) {
        found.push({
          allergen,
          severity: this.getSeverity(allergen),
          found: true
        })
      }
    })

    return found
  }

  /**
   * Get fallback uses based on medicine name
   */
  private getFallbackUses(medicineName: string): string[] {
    const name = medicineName.toLowerCase()
    
    if (name.includes('paracetamol') || name.includes('acetaminophen')) {
      return ['Fever', 'Pain relief', 'Headache', 'Body aches', 'Toothache']
    }
    if (name.includes('ibuprofen')) {
      return ['Pain relief', 'Inflammation', 'Fever', 'Arthritis', 'Menstrual cramps']
    }
    if (name.includes('antibiotic') || name.includes('amoxicillin') || name.includes('azithromycin')) {
      return ['Bacterial infections', 'Respiratory infections', 'Skin infections', 'UTI', 'Ear infections']
    }
    if (name.includes('antacid') || name.includes('ranitidine') || name.includes('omeprazole')) {
      return ['Acid reflux', 'Heartburn', 'Stomach upset', 'Indigestion', 'Gastritis']
    }
    if (name.includes('cough') || name.includes('syrup')) {
      return ['Cough relief', 'Cold symptoms', 'Throat irritation', 'Chest congestion']
    }
    if (name.includes('antihistamine') || name.includes('loratadine') || name.includes('cetirizine')) {
      return ['Allergies', 'Hay fever', 'Itching', 'Rashes', 'Runny nose']
    }
    
    return ['Pain relief', 'Symptom management', 'Treatment as prescribed', 'Consult doctor for specific use']
  }

  /**
   * Get fallback side effects based on medicine type
   */
  private getFallbackSideEffects(medicineName: string): string[] {
    const name = medicineName.toLowerCase()
    
    if (name.includes('antibiotic')) {
      return ['Nausea', 'Diarrhea', 'Stomach upset', 'Allergic reactions', 'Dizziness']
    }
    if (name.includes('pain') || name.includes('ibuprofen') || name.includes('paracetamol')) {
      return ['Nausea', 'Dizziness', 'Stomach upset', 'Headache', 'Drowsiness']
    }
    if (name.includes('antacid')) {
      return ['Constipation', 'Diarrhea', 'Nausea', 'Stomach cramps']
    }
    if (name.includes('antihistamine')) {
      return ['Drowsiness', 'Dry mouth', 'Dizziness', 'Headache', 'Nausea']
    }
    
    return ['Nausea', 'Dizziness', 'Headache', 'Stomach upset', 'Allergic reactions (rare)']
  }

  /**
   * Translate scan result to Hindi
   */
  async translateToHindi(scanResult: ScanResult): Promise<ScanResult> {
    if (!genAI) {
      throw new Error('Gemini API key not configured')
    }

    try {
      const model = this.getModel('gemini-2.0-flash-exp') // Use 2.0 flash model
      
      // Build translation prompt
      const translationPrompt = this.buildTranslationPrompt(scanResult)
      
      // Use retry mechanism for translation
      const result = await this.generateContentWithRetry(model, [translationPrompt], 2)
      const response = result.response
      const translatedText = response.text()
      
      // Parse translated result
      return this.parseTranslatedResponse(translatedText, scanResult)
    } catch (error: any) {
      console.error('Translation error:', error)
      // Return original if translation fails
      return scanResult
    }
  }

  /**
   * Build translation prompt
   */
  private buildTranslationPrompt(scanResult: ScanResult): string {
    if (scanResult.scanType === 'medicine' && scanResult.medicineInfo) {
      return `Translate this medicine information to Hindi (Devanagari script). Keep the structure and return JSON.

Original English:
{
  "name": "${scanResult.medicineInfo.name}",
  "genericName": "${scanResult.medicineInfo.genericName || ''}",
  "uses": ${JSON.stringify(scanResult.medicineInfo.uses)},
  "indications": ${JSON.stringify(scanResult.medicineInfo.indications)},
  "sideEffects": ${JSON.stringify(scanResult.medicineInfo.sideEffects)},
  "contraindications": ${JSON.stringify(scanResult.medicineInfo.contraindications)},
  "dosage": "${scanResult.medicineInfo.dosage}",
  "precautions": ${JSON.stringify(scanResult.medicineInfo.precautions)},
  "interactions": ${JSON.stringify(scanResult.medicineInfo.interactions || [])},
  "results": "${scanResult.medicineInfo.results}"
}

Translate ALL text to Hindi. Return ONLY valid JSON with the same structure, all text in Hindi (Devanagari script).`
    } else {
      return `Translate this food label information to Hindi (Devanagari script). Keep the structure and return JSON.

Original English:
{
  "ingredients": ${JSON.stringify(scanResult.ingredients)},
  "nutritionScore": {
    "grade": "${scanResult.nutritionScore.grade}",
    "score": ${scanResult.nutritionScore.score},
    "reasons": ${JSON.stringify(scanResult.nutritionScore.reasons)}
  },
  "warnings": ${JSON.stringify(scanResult.warnings)},
  "safeAlternatives": ${JSON.stringify(scanResult.safeAlternatives)},
  "allergens": ${JSON.stringify(scanResult.allergens.map(a => ({ allergen: a.allergen, severity: a.severity, found: a.found })))}
}

Translate ALL text to Hindi. Return ONLY valid JSON with the same structure, all text in Hindi (Devanagari script).`
    }
  }

  /**
   * Parse translated response
   */
  private parseTranslatedResponse(translatedText: string, originalResult: ScanResult): ScanResult {
    try {
      // Extract JSON from response
      let jsonText = translatedText.trim()
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return originalResult // Return original if parsing fails
      }

      const parsed = JSON.parse(jsonMatch[0])

      if (originalResult.scanType === 'medicine' && originalResult.medicineInfo) {
        return {
          ...originalResult,
          medicineInfo: {
            name: parsed.name || originalResult.medicineInfo.name,
            genericName: parsed.genericName || originalResult.medicineInfo.genericName,
            uses: parsed.uses || originalResult.medicineInfo.uses,
            indications: parsed.indications || originalResult.medicineInfo.indications,
            sideEffects: parsed.sideEffects || originalResult.medicineInfo.sideEffects,
            contraindications: parsed.contraindications || originalResult.medicineInfo.contraindications,
            dosage: parsed.dosage || originalResult.medicineInfo.dosage,
            precautions: parsed.precautions || originalResult.medicineInfo.precautions,
            interactions: parsed.interactions || originalResult.medicineInfo.interactions,
            results: parsed.results || originalResult.medicineInfo.results
          },
          warnings: parsed.warnings || originalResult.warnings
        }
      } else {
        return {
          ...originalResult,
          ingredients: parsed.ingredients || originalResult.ingredients,
          nutritionScore: parsed.nutritionScore ? {
            grade: parsed.nutritionScore.grade || originalResult.nutritionScore.grade,
            score: parsed.nutritionScore.score || originalResult.nutritionScore.score,
            reasons: parsed.nutritionScore.reasons || originalResult.nutritionScore.reasons
          } : originalResult.nutritionScore,
          warnings: parsed.warnings || originalResult.warnings,
          safeAlternatives: parsed.safeAlternatives || originalResult.safeAlternatives,
          allergens: parsed.allergens ? parsed.allergens.map((a: any, idx: number) => ({
            allergen: a.allergen || originalResult.allergens[idx]?.allergen || '',
            severity: a.severity || originalResult.allergens[idx]?.severity || 'low',
            found: a.found !== undefined ? a.found : originalResult.allergens[idx]?.found || false
          })) : originalResult.allergens
        }
      }
    } catch (error) {
      console.error('Error parsing translated response:', error)
      return originalResult
    }
  }

  /**
   * Get severity level for allergen
   */
  private getSeverity(allergen: string): 'high' | 'medium' | 'low' {
    const highSeverity = [
      'peanut', 'tree nut', 'walnut', 'almond', 'cashew', 'pistachio',
      'shellfish', 'shrimp', 'crab', 'lobster', 'fish'
    ]
    
    const mediumSeverity = [
      'milk', 'dairy', 'lactose', 'egg', 'soy', 'wheat', 'gluten'
    ]

    const allergenLower = allergen.toLowerCase()
    
    if (highSeverity.some(s => allergenLower.includes(s))) {
      return 'high'
    }
    if (mediumSeverity.some(s => allergenLower.includes(s))) {
      return 'medium'
    }
    
    return 'low'
  }
}

export const nutriScanService = new NutriScanService()


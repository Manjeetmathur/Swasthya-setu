import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

interface Disease {
  id: string
  name: string
  description: string
  symptoms: string[]
  causes: string[]
  cure: string[]
  prevention: string[]
  severity: 'low' | 'moderate' | 'high'
}

const diseases: Disease[] = [
  {
    id: '1',
    name: 'Common Cold',
    description: 'A viral infection affecting the upper respiratory tract',
    symptoms: ['Runny nose', 'Sneezing', 'Cough', 'Sore throat', 'Mild headache'],
    causes: ['Virus exposure', 'Weakened immune system', 'Cold weather exposure'],
    cure: ['Rest and hydration', 'Over-the-counter cold medications', 'Steam inhalation', 'Vitamin C supplements', 'Warm saline gargles'],
    prevention: ['Frequent handwashing', 'Avoid close contact with infected people', 'Maintain good hygiene', 'Boost immunity with vitamins'],
    severity: 'low'
  },
  {
    id: '2',
    name: 'Influenza (Flu)',
    description: 'A contagious respiratory illness caused by influenza viruses',
    symptoms: ['Fever', 'Body aches', 'Fatigue', 'Cough', 'Headache', 'Chills'],
    causes: ['Influenza virus', 'Close contact with infected individuals', 'Weakened immune system'],
    cure: ['Antiviral medications (Tamiflu)', 'Rest and plenty of fluids', 'Pain relievers (Ibuprofen, Acetaminophen)', 'Antipyretic medications', 'Medical consultation if severe'],
    prevention: ['Annual flu vaccination', 'Avoid close contact with sick people', 'Wash hands frequently', 'Cover mouth when coughing'],
    severity: 'moderate'
  },
  {
    id: '3',
    name: 'Hypertension (High Blood Pressure)',
    description: 'A condition where the force of blood against artery walls is too high',
    symptoms: ['Headaches', 'Shortness of breath', 'Dizziness', 'Chest pain', 'Vision problems'],
    causes: ['Age', 'Family history', 'Obesity', 'Lack of exercise', 'High sodium diet', 'Stress'],
    cure: ['Lifestyle changes (diet, exercise)', 'Medications (ACE inhibitors, Beta-blockers)', 'Reduced salt intake', 'Weight management', 'Regular monitoring'],
    prevention: ['Maintain healthy weight', 'Exercise regularly', 'Reduce sodium intake', 'Limit alcohol', 'Manage stress', 'Regular health checkups'],
    severity: 'high'
  },
  {
    id: '4',
    name: 'Diabetes Type 2',
    description: 'A chronic condition affecting how the body processes blood sugar',
    symptoms: ['Increased thirst', 'Frequent urination', 'Fatigue', 'Blurred vision', 'Slow healing wounds'],
    causes: ['Genetics', 'Obesity', 'Sedentary lifestyle', 'Poor diet', 'Age', 'Insulin resistance'],
    cure: ['Blood sugar monitoring', 'Oral medications (Metformin)', 'Insulin therapy if needed', 'Diet management (low carb)', 'Regular exercise', 'Weight loss'],
    prevention: ['Maintain healthy weight', 'Eat balanced diet', 'Regular physical activity', 'Monitor blood sugar', 'Regular health screenings'],
    severity: 'high'
  },
  {
    id: '5',
    name: 'Asthma',
    description: 'A chronic respiratory condition causing airway inflammation and narrowing',
    symptoms: ['Wheezing', 'Shortness of breath', 'Chest tightness', 'Coughing', 'Difficulty breathing'],
    causes: ['Genetics', 'Environmental allergens', 'Respiratory infections', 'Exercise', 'Cold air', 'Stress'],
    cure: ['Inhalers (bronchodilators)', 'Corticosteroids', 'Avoiding triggers', 'Breathing exercises', 'Regular medication', 'Emergency inhaler for attacks'],
    prevention: ['Identify and avoid triggers', 'Take prescribed medications', 'Use air purifiers', 'Avoid smoking', 'Regular medical checkups'],
    severity: 'moderate'
  },
  {
    id: '6',
    name: 'Migraine',
    description: 'A neurological condition characterized by severe headaches',
    symptoms: ['Severe headache', 'Nausea', 'Sensitivity to light/sound', 'Aura (visual disturbances)', 'Vomiting'],
    causes: ['Genetic factors', 'Hormonal changes', 'Stress', 'Sleep disorders', 'Dietary triggers', 'Weather changes'],
    cure: ['Pain relievers (Ibuprofen, Aspirin)', 'Triptans for severe cases', 'Rest in dark room', 'Cold compress', 'Prescription medications', 'Lifestyle modifications'],
    prevention: ['Identify and avoid triggers', 'Maintain regular sleep', 'Manage stress', 'Regular exercise', 'Stay hydrated', 'Keep headache diary'],
    severity: 'moderate'
  },
  {
    id: '7',
    name: 'Arthritis',
    description: 'Inflammation of one or more joints causing pain and stiffness',
    symptoms: ['Joint pain', 'Stiffness', 'Swelling', 'Reduced range of motion', 'Fatigue'],
    causes: ['Age', 'Genetics', 'Previous joint injury', 'Obesity', 'Autoimmune disorders', 'Infection'],
    cure: ['Pain relievers (NSAIDs)', 'Physical therapy', 'Joint injections', 'Lifestyle modifications', 'Assistive devices', 'Surgery in severe cases'],
    prevention: ['Maintain healthy weight', 'Regular exercise', 'Protect joints from injury', 'Balanced diet', 'Avoid repetitive joint stress'],
    severity: 'moderate'
  },
  {
    id: '8',
    name: 'Pneumonia',
    description: 'Infection that inflames air sacs in one or both lungs',
    symptoms: ['Chest pain', 'Cough with phlegm', 'Fever', 'Difficulty breathing', 'Fatigue', 'Nausea'],
    causes: ['Bacterial infection', 'Viral infection', 'Fungal infection', 'Weakened immune system', 'Hospital-acquired'],
    cure: ['Antibiotics (for bacterial)', 'Antiviral medications (for viral)', 'Rest and fluids', 'Oxygen therapy if needed', 'Fever reducers', 'Hospitalization if severe'],
    prevention: ['Vaccination (pneumococcal, flu)', 'Good hygiene', 'Avoid smoking', 'Strengthen immune system', 'Stay healthy'],
    severity: 'high'
  },
  {
    id: '9',
    name: 'Gastritis',
    description: 'Inflammation of the stomach lining',
    symptoms: ['Stomach pain', 'Nausea', 'Vomiting', 'Bloating', 'Loss of appetite', 'Indigestion'],
    causes: ['H. pylori infection', 'Excessive alcohol', 'NSAIDs overuse', 'Stress', 'Autoimmune conditions'],
    cure: ['Antacids', 'H2 blockers', 'Proton pump inhibitors', 'Antibiotics (if H. pylori)', 'Dietary changes', 'Avoid irritants'],
    prevention: ['Eat smaller meals', 'Avoid spicy/fatty foods', 'Limit alcohol', 'Reduce stress', 'Avoid NSAIDs if possible', 'Treat infections promptly'],
    severity: 'low'
  },
  {
    id: '10',
    name: 'Urinary Tract Infection (UTI)',
    description: 'Infection in any part of the urinary system',
    symptoms: ['Burning during urination', 'Frequent urination', 'Cloudy urine', 'Pelvic pain', 'Fever'],
    causes: ['Bacterial infection (E. coli)', 'Poor hygiene', 'Sexual activity', 'Catheter use', 'Blockages in urinary tract'],
    cure: ['Antibiotics', 'Increased water intake', 'Cranberry juice', 'Pain relievers', 'Warm compress', 'Avoid irritants'],
    prevention: ['Drink plenty of water', 'Wipe front to back', 'Urinate after sex', 'Avoid holding urine', 'Maintain good hygiene'],
    severity: 'moderate'
  }
]

export default function Diseases() {
  const router = useRouter()
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null)

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      case 'moderate':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900 pt-10">
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            Diseases & Cures
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        <Text className="text-gray-600 dark:text-gray-400 mb-4">
          Learn about common diseases, their symptoms, causes, treatments, and prevention methods.
        </Text>

        <View className="space-y-4 mt-4 mb-6">
          {diseases.map((disease) => (
            <TouchableOpacity
              key={disease.id}
              onPress={() => setSelectedDisease(disease)}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-4"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  {disease.name}
                </Text>
                <View className={`px-3 py-1 rounded-full ${getSeverityColor(disease.severity)}`}>
                  <Text className={`text-xs font-semibold capitalize`}>
                    {disease.severity}
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {disease.description}
              </Text>
              <View className="flex-row items-center">
                <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  Tap to view details
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Disease Detail Modal */}
      {selectedDisease && (
        <View className="absolute inset-0 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl" style={{ maxHeight: '85%', height: '85%' }}>
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedDisease.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDisease(null)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 py-4" style={{ height: '100%' }}>
              <Text className="text-gray-600 dark:text-gray-400 mb-4">
                {selectedDisease.description}
              </Text>

              {/* Symptoms */}
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Symptoms
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {selectedDisease.symptoms.map((symptom, index) => (
                    <View key={index} className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                      <Text className="text-sm text-blue-700 dark:text-blue-300">
                        {symptom}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Causes */}
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Causes
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {selectedDisease.causes.map((cause, index) => (
                    <View key={index} className="bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">
                      <Text className="text-sm text-orange-700 dark:text-orange-300">
                        {cause}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Cure */}
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Treatment & Cure
                </Text>
                <View className="space-y-2">
                  {selectedDisease.cure.map((cure, index) => (
                    <View key={index} className="flex-row items-start">
                      <View className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full mt-1 mr-3">
                        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                      </View>
                      <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        {cure}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Prevention */}
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Prevention
                </Text>
                <View className="space-y-2">
                  {selectedDisease.prevention.map((prevent, index) => (
                    <View key={index} className="flex-row items-start">
                      <View className="bg-purple-100 dark:bg-purple-900/30 p-1 rounded-full mt-1 mr-3">
                        <Ionicons name="shield-checkmark" size={16} color="#9333ea" />
                      </View>
                      <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        {prevent}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-4 mb-8">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="warning" size={20} color="#2563eb" />
                  <Text className="text-blue-900 dark:text-blue-100 font-semibold ml-2">
                    Important Note
                  </Text>
                </View>
                <Text className="text-sm text-blue-800 dark:text-blue-200">
                  This information is for educational purposes only. Always consult with a healthcare professional for proper diagnosis and treatment.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}


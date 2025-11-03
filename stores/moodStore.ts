import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { VoiceAnalysis } from '@/lib/voiceAnalysisService'

interface MoodEntry {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  timestamp: Date
  score: number
  tone: string
  energy: string
  transcription?: string
  audioUrl?: string
  moodImageUrl?: string
  analysis: VoiceAnalysis
}

interface MoodStore {
  entries: MoodEntry[]
  isLoading: boolean
  currentAlert: {
    show: boolean
    message: string
    consecutiveLowDays: number
  }
  addMoodEntry: (userId: string, analysis: VoiceAnalysis, audioBase64?: string, transcription?: string) => Promise<void>
  checkLowMoodAlert: (userId: string) => Promise<void>
  getMoodHistory: (userId: string, days?: number) => MoodEntry[]
  clearAlert: () => void
  loadMoodHistory: (userId: string) => Promise<void>
}

const MOOD_STORAGE_KEY = 'medimind_mood_entries'
const LOW_MOOD_THRESHOLD = 40
const ALERT_DAYS = 2

export const useMoodStore = create<MoodStore>((set, get) => ({
  entries: [],
  isLoading: false,
  currentAlert: {
    show: false,
    message: '',
    consecutiveLowDays: 0
  },

  addMoodEntry: async (userId: string, analysis: VoiceAnalysis, audioBase64?: string, transcription?: string) => {
    set({ isLoading: true })
    
    try {
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0]

      // Audio is used only for analysis, not uploaded to storage
      // Analysis results are saved without audio files

      // Save to Firestore
      const moodEntry = {
        userId,
        date: dateStr,
        timestamp: Timestamp.now(),
        score: analysis.score,
        tone: analysis.tone,
        energy: analysis.energy,
        transcription: transcription || '',
        audioUrl: '', // Not storing audio
        moodImageUrl: '', // Not storing images
        analysis: analysis
      }

      const docRef = await addDoc(collection(db, 'moodEntries'), moodEntry)

      // Add to local state
      const newEntry: MoodEntry = {
        id: docRef.id,
        ...moodEntry,
        timestamp: new Date()
      }

      set(state => ({
        entries: [...state.entries, newEntry],
        isLoading: false
      }))

      // Check for low mood alert
      await get().checkLowMoodAlert(userId)
    } catch (error: any) {
      console.error('Error adding mood entry:', error)
      set({ isLoading: false })
      throw error
    }
  },

  checkLowMoodAlert: async (userId: string) => {
    try {
      const entries = get().getMoodHistory(userId, 7)
      const recentEntries = entries.slice(-ALERT_DAYS)
      
      if (recentEntries.length < ALERT_DAYS) {
        return
      }

      const allLow = recentEntries.every(entry => entry.score < LOW_MOOD_THRESHOLD)
      
      if (allLow) {
        set({
          currentAlert: {
            show: true,
            message: "You've sounded low for 2 days. Want to talk?",
            consecutiveLowDays: ALERT_DAYS
          }
        })
      }
    } catch (error) {
      console.error('Error checking mood alert:', error)
    }
  },

  getMoodHistory: (userId: string, days: number = 30) => {
    const { entries } = get()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return entries
      .filter(entry => entry.userId === userId && entry.timestamp >= cutoffDate)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  },

  clearAlert: () => {
    set({
      currentAlert: {
        show: false,
        message: '',
        consecutiveLowDays: 0
      }
    })
  },

  loadMoodHistory: async (userId: string) => {
    set({ isLoading: true })
    
    try {
      const q = query(
        collection(db, 'moodEntries'),
        where('userId', '==', userId)
      )
      
      const snapshot = await getDocs(q)
      const loadedEntries: MoodEntry[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as MoodEntry))

      set({
        entries: loadedEntries,
        isLoading: false
      })

      // Check for alerts
      await get().checkLowMoodAlert(userId)
    } catch (error: any) {
      console.error('Error loading mood history:', error)
      set({ isLoading: false })
    }
  }
}))



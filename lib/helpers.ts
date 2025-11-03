import { Timestamp } from 'firebase/firestore'

export const formatDate = (timestamp: Timestamp | Date): string => {
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const formatTime = (timestamp: Timestamp | Date): string => {
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatDateTime = (timestamp: Timestamp | Date): string => {
  return `${formatDate(timestamp)} at ${formatTime(timestamp)}`
}

export const isToday = (timestamp: Timestamp | Date): boolean => {
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export const getChatId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_')
}


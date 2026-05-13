export type CompetitionStatus = 'waiting' | 'active' | 'finished'

export type ParticipantRow = {
  id: string
  competition_id: string
  user_id: string
  display_name: string
  avatar_type: number
  digits_correct: number
  wrong_attempts: number
  eliminated: boolean
  joined_at: string
  last_input_at: string | null
}

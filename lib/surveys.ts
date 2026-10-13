import surveyFile from '@/data/surveys.json'
import type { SurveyPhase, SurveyQuestion } from '@/lib/study-access'

export type { SurveyPhase, SurveyQuestion }

export type SurveyPhaseContent = {
  title: string
  detail: string
  questions: SurveyQuestion[]
}

export const surveyContent = surveyFile.phases as Record<SurveyPhase, SurveyPhaseContent>

export const surveyPhases: SurveyPhase[] = ['pre', 'mid', 'post']

export function questionsFor(phase: SurveyPhase): SurveyQuestion[] {
  return surveyContent[phase].questions
}

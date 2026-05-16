/**
 * lib/gemini.ts
 *
 * Adapted from materials/Exam_Grading.ipynb.
 *
 * Two modes:
 *   gradeSubmission – formal grading against the assignment rubric, stored in
 *                     the DB and held for instructor approval before the student
 *                     sees it.
 *   getFeedback     – formative pre-submission feedback; never stored, returned
 *                     directly to the student.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager } from '@google/generative-ai/server'
import { readFile } from 'fs/promises'
import type { Assignment } from '@/lib/assignments'

// ── Types ─────────────────────────────────────────────────────────────────────

export type RubricScore = {
  criterion_id: string
  label: string
  points_earned: number
  points_available: number
  justification: string
}

export type GradeResult = {
  total_score: number
  total_available: number
  rubric_scores: RubricScore[]
  overall_feedback: string
  confidence_notes: string
}

export type FeedbackResult = {
  strengths: string[]
  areas_for_improvement: string[]
  specific_suggestions: string[]
  overall_encouragement: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getClients() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  return {
    genAI: new GoogleGenerativeAI(key),
    fileManager: new GoogleAIFileManager(key),
  }
}

export function rubricPromptBlock(assignment: Assignment): string {
  const criteria = assignment.rubric.criteria
    .map((c) => `- [${c.id}] ${c.label} (${c.points} pts): ${c.description}`)
    .join('\n')
  const deliverables = (assignment.deliverables ?? [])
    .map((d) => `- ${d.label}: ${d.description}`)
    .join('\n')

  const proposalSectionsBlock =
    assignment.proposalSections && assignment.proposalSections.length > 0
      ? `\nREQUIRED PROPOSAL SECTIONS (the submission must address all of these):\n` +
        assignment.proposalSections
          .map((s) => `- ${s.label}: ${s.description}`)
          .join('\n')
      : ''

  return `ASSIGNMENT: ${assignment.title}

DELIVERABLES EXPECTED:
${deliverables}${proposalSectionsBlock}

RUBRIC (total ${assignment.rubric.totalPoints} pts):
${criteria}`
}

function cleanJson(text: string): string {
  return text.replace(/```json|```/g, '').trim()
}

// ── Prompt builders (exported for instructor preview) ─────────────────────────

export function buildGradePrompt(assignment: Assignment): string {
  return `You are a geology teaching assistant grading a student submission.

${rubricPromptBlock(assignment)}

ASSESSMENT GUIDELINES:
- Grade each criterion strictly against its description above — do not import expectations from other assignments.
- Award partial credit wherever the work demonstrates geological understanding, even if the submission is incomplete.
- Shareable or embed links cannot be followed — evaluate only what is visible in the submitted document.
- If a scan is illegible or a page appears missing, note it in confidence_notes and grade what you can see.

GRADING INSTRUCTIONS:
1. Grade each rubric criterion independently.
2. Justify each score in one clear sentence citing specific evidence from the submission.
3. Write 2–3 sentences of overall constructive feedback the instructor can share with the student.

Return ONLY a raw JSON object — no markdown code blocks:
{
  "total_score": <integer>,
  "total_available": ${assignment.rubric.totalPoints},
  "rubric_scores": [
    {
      "criterion_id": "<id from rubric>",
      "label": "<criterion label>",
      "points_earned": <integer>,
      "points_available": <integer>,
      "justification": "<one sentence reason>"
    }
  ],
  "overall_feedback": "<2-3 sentences>",
  "confidence_notes": "<items you could not evaluate, or 'None'>"
}`
}

export function buildFeedbackPrompt(assignment: Assignment): string {
  const learningGoals = (assignment.learningGoals ?? []).map((g) => `- ${g}`).join('\n')
  const deliverables = (assignment.deliverables ?? [])
    .map((d) => `- ${d.label}: ${d.description}`)
    .join('\n')

  return `You are a supportive geology instructor reviewing a DRAFT student submission for formative feedback. This is NOT formal grading — your role is to help the student improve before they submit.

ASSIGNMENT: ${assignment.title}

LEARNING GOALS:
${learningGoals}

WHAT A STRONG SUBMISSION INCLUDES — evaluate the draft against each of these:
${deliverables}

FEEDBACK INSTRUCTIONS:
1. Be encouraging — identify genuine strengths first.
2. Identify the 2–3 most important gaps relative to the deliverable descriptions above.
3. Give specific, actionable suggestions grounded in this assignment's content.
4. Do NOT assign a score, grade, or percentage.
5. Keep suggestions concise and practical.

Return ONLY a raw JSON object — no markdown code blocks:
{
  "strengths": ["<strength>", "..."],
  "areas_for_improvement": ["<area>", "..."],
  "specific_suggestions": ["<actionable suggestion>", "..."],
  "overall_encouragement": "<1-2 sentences of overall encouragement>"
}`
}

// ── Grading engine ─────────────────────────────────────────────────────────────
//
// Called server-side after a student PDF is saved to disk.
// Mirrors the notebook's grade_exam() function but against the per-assignment
// rubric from assignments.json instead of a static answer key.

export async function gradeSubmission(
  fileBuffer: Buffer,
  assignment: Assignment
): Promise<GradeResult> {
  const { genAI } = getClients()

  const prompt = buildGradePrompt(assignment)

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })
  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: fileBuffer.toString('base64'),
      },
    },
  ])

  return JSON.parse(cleanJson(result.response.text())) as GradeResult
}

// ── Feedback engine ────────────────────────────────────────────────────────────
//
// Called when a student uploads a draft for pre-submission review.
// Uses inline base64 data so no file is persisted to the Gemini File API.
// Never returns a score — purely formative.

export async function getFeedback(
  fileBuffer: Buffer,
  assignment: Assignment
): Promise<FeedbackResult> {
  const { genAI } = getClients()

  const prompt = buildFeedbackPrompt(assignment)

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })
  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: fileBuffer.toString('base64'),
      },
    },
  ])

  return JSON.parse(cleanJson(result.response.text())) as FeedbackResult
}

// Re-export for convenience in route handlers
export { readFile }

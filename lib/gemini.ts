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

function rubricPromptBlock(assignment: Assignment): string {
  const criteria = assignment.rubric.criteria
    .map((c) => `- [${c.id}] ${c.label} (${c.points} pts): ${c.description}`)
    .join('\n')
  const deliverables = (assignment.deliverables ?? [])
    .map((d) => `- ${d.label}: ${d.description}`)
    .join('\n')
  return `ASSIGNMENT: ${assignment.title}

DELIVERABLES EXPECTED:
${deliverables}

RUBRIC (total ${assignment.rubric.totalPoints} pts):
${criteria}`
}

function cleanJson(text: string): string {
  return text.replace(/```json|```/g, '').trim()
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

  const prompt = `You are a geology teaching assistant grading a student submission.

${rubricPromptBlock(assignment)}

ASSESSMENT GUIDELINES:
- Award partial credit wherever the work demonstrates geological understanding, even if the submission is incomplete.
- Field maps and cross sections: assess correctness of unit boundaries, strike/dip and fault symbols, legend, north arrow, scale bar, and cross-section geometry.
- Visible Geology model screenshots: evaluate whether the model geometry (dip, strike, layer sequence, structural events) matches the geological constraints stated in the rubric. Shareable links cannot be followed — grade from screenshots only.
- Stratigraphic columns / sedimentary logs: check grain-size axis orientation, correct lithological symbols at proportional bed thicknesses, unit labels, depositional environment interpretations, and the transgression/regression conclusion.
- Lithostratigraphic correlation diagrams: assess whether correlation lines connect equivalent units across all locations, relative thicknesses are geologically plausible, and thickness variations are explained with a specific geological mechanism.
- CO₂ / subsurface assessment essays: check that reservoir quality, trap geometry, and seal integrity are each addressed and that the site recommendation is backed by evidence from the model.
- Written analyses (all types): evaluate geological accuracy, citation of specific evidence from the submitted work, and clarity of argument.
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

  const learningGoals = (assignment.learningGoals ?? []).map((g) => `- ${g}`).join('\n')
  const deliverables = (assignment.deliverables ?? [])
    .map((d) => `- ${d.label}: ${d.description}`)
    .join('\n')

  const prompt = `You are a supportive geology instructor reviewing a DRAFT student submission for formative feedback. This is NOT formal grading — your role is to help the student improve before they submit.

ASSIGNMENT: ${assignment.title}

LEARNING GOALS:
${learningGoals}

WHAT A STRONG SUBMISSION INCLUDES:
${deliverables}

FEEDBACK GUIDELINES — check the following depending on what is present in the draft:
- Field maps: complete unit boundary coverage, correct strike/dip and fault symbols, legend, north arrow, scale bar, and section line labelled A–B.
- Visible Geology model screenshots: model geometry (dip direction, layer sequence, structural events) should reflect the geological constraints in the assignment; note if constraints appear unmet.
- Stratigraphic columns / sedimentary logs: grain-size axis correct (clay → gravel), lithological symbols accurate and at proportional thicknesses, units labelled with depositional environments, transgression/regression conclusion stated and justified.
- Lithostratigraphic correlation diagrams: correlation lines connect equivalent units across all locations, thicknesses are geologically plausible, at least one sentence explains lateral thickness variation.
- CO₂ / subsurface essays: reservoir quality, structural trap, and seal integrity addressed separately; a specific site recommended with geological justification.
- Written analyses (all types): geological evidence cited from the student's own map/model/core data, appropriate terminology, clear causal reasoning.

FEEDBACK INSTRUCTIONS:
1. Be encouraging — identify genuine strengths first.
2. Identify the 2–3 most important improvements before formal submission.
3. Give specific, actionable suggestions (e.g. "add a north arrow to your map", "label the fault dip angle", "explain why the V-pattern closes in that direction", "include a grain-size axis on your stratigraphic column").
4. Do NOT assign a score, grade, or percentage.
5. Keep suggestions concise and practical.

Return ONLY a raw JSON object — no markdown code blocks:
{
  "strengths": ["<strength>", "..."],
  "areas_for_improvement": ["<area>", "..."],
  "specific_suggestions": ["<actionable suggestion>", "..."],
  "overall_encouragement": "<1-2 sentences of overall encouragement>"
}`

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

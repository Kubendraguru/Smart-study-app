import { supabase } from '@/lib/supabase';
import type {
  AIProposedPlan,
  AIDaySchedule,
  AISessionItem,
  StudyPlan,
  TaskPriority,
} from '@/types';
import { getLocalDateString, createStudyTask } from './studyPlanner';
import { getStudentUpcomingExams } from './exam';
import { sendAiChatMessage } from './ai';

export interface PlanGenerationOptions {
  studentId: string;
  availableHoursPerDay: number; // e.g. 2, 3, 4
  preferredStartTime: string; // e.g. "09:00"
  preferredEndTime: string; // e.g. "21:00"
  difficultyPreferences?: Record<string, 'easy' | 'medium' | 'hard'>;
  planDurationDays?: number; // default 7 days
}

/**
 * Gather complete student academic context from Supabase
 */
export async function gatherAcademicContext(studentId: string) {
  // 1. Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, semester, department')
    .eq('id', studentId)
    .maybeSingle();

  const semester = profile?.semester || 5;

  // 2. Get upcoming exams
  const exams = await getStudentUpcomingExams(studentId);

  // 3. Get enrolled subjects with their units
  const { data: subjectsData } = await supabase
    .from('subjects')
    .select('id, subject_code, subject_name, credits, units(id, unit_number, unit_title)')
    .eq('semester', semester)
    .order('subject_name');

  // 4. Get pending tasks
  const { data: pendingTasks } = await supabase
    .from('study_tasks')
    .select('title, status, study_date')
    .eq('student_id', studentId)
    .eq('status', 'pending');

  return {
    studentName: profile?.full_name || 'Student',
    semester,
    department: profile?.department || 'Engineering',
    exams: exams.map((e) => ({
      subjectCode: e.subject?.subject_code,
      subjectName: e.subject?.subject_name,
      title: e.exam_title,
      date: e.exam_date,
      daysRemaining: e.days_remaining,
    })),
    subjects: (subjectsData ?? []).map((s: any) => ({
      id: s.id,
      code: s.subject_code,
      name: s.subject_name,
      units: (s.units ?? []).map((u: any) => ({
        id: u.id,
        number: u.unit_number,
        title: u.unit_title,
      })),
    })),
    pendingTasksCount: (pendingTasks ?? []).length,
  };
}

/**
 * Generate a deterministic heuristic study plan if AI is offline or returns an unparseable response
 */
function generateHeuristicPlan(
  context: any,
  options: PlanGenerationOptions
): AIProposedPlan {
  const days: AIDaySchedule[] = [];
  const duration = options.planDurationDays || 7;
  const now = new Date();
  const subjects = context.subjects.length > 0 ? context.subjects : [
    { id: '1', name: 'Core Subject 1', code: 'CS501', units: [{ id: 'u1', number: 1, title: 'Foundations' }] }
  ];

  const [startHour] = options.preferredStartTime.split(':').map(Number);
  const sessionDurationHours = Math.min(1.5, options.availableHoursPerDay / 2);

  for (let i = 0; i < duration; i++) {
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + i);
    const dateStr = getLocalDateString(targetDate);
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

    const sessions: AISessionItem[] = [];
    let currentH = startHour || 9;

    // Distribute subjects across days
    const subjA = subjects[i % subjects.length];
    const unitA = (subjA.units && subjA.units.length > 0) ? subjA.units[0] : null;

    const startStrA = `${String(Math.floor(currentH)).padStart(2, '0')}:00`;
    currentH += sessionDurationHours;
    const endStrA = `${String(Math.floor(currentH)).padStart(2, '0')}:00`;

    sessions.push({
      subject_id: subjA.id,
      subject_name: subjA.name,
      unit_id: unitA?.id,
      unit_title: unitA?.title || 'Unit 1 Core Concepts',
      title: `${subjA.name}: ${unitA?.title || 'Unit Concepts'}`,
      description: `Detailed deep dive into key theory, formulas, and textbook practice problems for ${subjA.name}.`,
      start_time: startStrA,
      end_time: endStrA,
      priority: (options.difficultyPreferences?.[subjA.id] === 'hard' ? 'high' : 'medium') as TaskPriority,
      type: 'learning',
    });

    // If available hours > 2, add second session (revision / practice)
    if (options.availableHoursPerDay >= 2.5 && subjects.length > 1) {
      currentH += 0.5; // 30 min break
      const subjB = subjects[(i + 1) % subjects.length];
      const startStrB = `${String(Math.floor(currentH)).padStart(2, '0')}:00`;
      currentH += sessionDurationHours;
      const endStrB = `${String(Math.floor(currentH)).padStart(2, '0')}:00`;

      sessions.push({
        subject_id: subjB.id,
        subject_name: subjB.name,
        title: `Revision & Problem Solving: ${subjB.name}`,
        description: `Review summary notes and solve previous exam questions.`,
        start_time: startStrB,
        end_time: endStrB,
        priority: 'medium',
        type: 'revision',
      });
    }

    days.push({
      date: dateStr,
      day_name: dayName,
      sessions,
    });
  }

  return {
    title: `Smart Study Timetable (${duration} Days)`,
    description: `Personalized academic timetable created for Semester ${context.semester} students.`,
    summary: `Organized ${days.reduce((acc, d) => acc + d.sessions.length, 0)} sessions across ${duration} days, balancing core unit concepts and revision intervals.`,
    available_hours_per_day: options.availableHoursPerDay,
    daily_schedules: days,
  };
}

/**
 * Generate a personalised AI Study Plan based on real Supabase data
 */
export async function generateAIStudyPlan(
  options: PlanGenerationOptions
): Promise<{ success: boolean; plan: AIProposedPlan; isAI: boolean; error?: string }> {
  try {
    const context = await gatherAcademicContext(options.studentId);

    const prompt = `You are an expert academic study planner for engineering and college students.
Generate a structured, realistic, non-overlapping study timetable in strict JSON format.

STUDENT DATA:
- Name: ${context.studentName}
- Current Semester: ${context.semester}
- Available study time: ${options.availableHoursPerDay} hours per day
- Preferred Study Hours: between ${options.preferredStartTime} and ${options.preferredEndTime}
- Upcoming Exams from Teachers: ${JSON.stringify(context.exams)}
- Enrolled Curriculum Subjects & Units: ${JSON.stringify(context.subjects)}
- Subject Difficulty Preferences: ${JSON.stringify(options.difficultyPreferences || {})}

RULES:
1. Divide subjects into manageable unit-wise daily sessions.
2. If an exam is upcoming in less than 14 days, prioritize that subject with targeted revision and question-solving sessions.
3. Keep individual study sessions between 45 to 90 minutes each with short breaks in between.
4. Total study time per day MUST NOT exceed ${options.availableHoursPerDay} hours.
5. All sessions MUST be within the window ${options.preferredStartTime} to ${options.preferredEndTime}.
6. Return a valid JSON object matching this exact schema:

{
  "title": "Semester ${context.semester} Exam Prep Timetable",
  "description": "Brief description of the timetable strategy",
  "summary": "2-3 sentences explaining how this plan optimizes the student's study time",
  "daily_schedules": [
    {
      "date": "${getLocalDateString()}",
      "day_name": "Today",
      "sessions": [
        {
          "subject_id": "UUID from provided subjects",
          "subject_name": "Subject Name",
          "unit_id": "UUID from provided units or null",
          "unit_title": "Unit Title",
          "title": "Topic or Unit Task Title",
          "description": "Actionable task instructions",
          "start_time": "HH:MM",
          "end_time": "HH:MM",
          "priority": "low" | "medium" | "high",
          "type": "learning" | "revision" | "practice"
        }
      ]
    }
  ]
}

DO NOT wrap with markdown backticks. Return raw JSON only.`;

    const aiRes = await sendAiChatMessage({
      message: prompt,
      history: [],
    });

    if (aiRes.success && aiRes.answer) {
      try {
        let cleanJson = aiRes.answer.trim();
        // Remove markdown code fences if model enclosed them
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(cleanJson);
        if (parsed && Array.isArray(parsed.daily_schedules) && parsed.daily_schedules.length > 0) {
          return {
            success: true,
            plan: {
              title: parsed.title || 'AI Generated Study Plan',
              description: parsed.description || 'Personalized study schedule',
              summary: parsed.summary || 'Custom study plan structured around your exams.',
              available_hours_per_day: options.availableHoursPerDay,
              daily_schedules: parsed.daily_schedules,
            },
            isAI: true,
          };
        }
      } catch (parseErr) {
        console.warn('Could not parse AI JSON, falling back to heuristic planner:', parseErr);
      }
    }

    // Fallback to intelligent deterministic heuristic plan
    const fallback = generateHeuristicPlan(context, options);
    return {
      success: true,
      plan: fallback,
      isAI: false,
    };
  } catch (err: any) {
    console.error('Error generating AI study plan:', err);
    return {
      success: false,
      plan: generateHeuristicPlan({ subjects: [], exams: [] }, options),
      isAI: false,
      error: err?.message || 'Failed to generate study plan',
    };
  }
}

/**
 * Permanently save an approved AI study plan to Supabase and schedule all session notifications
 */
export async function saveAIStudyPlan(
  studentId: string,
  proposedPlan: AIProposedPlan,
  options: PlanGenerationOptions
): Promise<{ success: boolean; planId?: string; tasksCount?: number; error?: string }> {
  try {
    // 1. Create the parent study_plans record
    const { data: planRecord, error: planErr } = await supabase
      .from('study_plans')
      .insert([
        {
          student_id: studentId,
          title: proposedPlan.title || 'AI Study Timetable',
          description: proposedPlan.description || null,
          available_hours_per_day: options.availableHoursPerDay,
          preferred_start_time: options.preferredStartTime,
          preferred_end_time: options.preferredEndTime,
          difficulty_preferences: options.difficultyPreferences || {},
          status: 'active',
          ai_summary: proposedPlan.summary || null,
        },
      ])
      .select('*')
      .single();

    if (planErr || !planRecord) {
      return { success: false, error: planErr?.message || 'Failed to save study plan' };
    }

    // 2. Create individual tasks for each scheduled session
    let tasksCount = 0;

    for (const day of proposedPlan.daily_schedules) {
      for (const session of day.sessions) {
        await createStudyTask({
          student_id: studentId,
          plan_id: planRecord.id,
          subject_id: session.subject_id || null,
          unit_id: session.unit_id || null,
          title: session.title,
          description: session.description,
          study_date: day.date,
          start_time: session.start_time,
          end_time: session.end_time,
          priority: session.priority || 'medium',
          reminder_enabled: true,
          reminder_minutes_before: 10,
          is_ai_generated: true,
        });

        tasksCount++;
      }
    }

    return { success: true, planId: planRecord.id, tasksCount };
  } catch (err: any) {
    console.error('Error saving AI study plan:', err);
    return { success: false, error: err?.message };
  }
}

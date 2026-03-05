/**
 * AI Assistant Edge Function
 * Provides intelligent leadership insights, suggestions, and support
 * Integrates with OpenAI GPT-4 for contextual responses
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface AIAssistantRequest {
  userId: string;
  teamId?: string;
  query: string;
  context?: "goal_setting" | "feedback" | "performance" | "team_dynamics" | "general";
  messageHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const systemPrompts: Record<string, string> = {
  goal_setting: `You are an expert leadership coach specializing in goal setting and OKR methodology. 
    Help users define clear, measurable, and achievable goals. Provide constructive feedback on goal clarity, 
    timeline realism, and alignment with organizational objectives. Use the SMART framework 
    (Specific, Measurable, Achievable, Relevant, Time-bound).`,

  feedback: `You are an experienced HR consultant and communication specialist. Help users craft constructive 
    feedback, understand feedback they've received, and develop coaching conversations. Emphasize empathy, 
    specificity, and actionable insights. Promote a growth mindset and psychological safety.`,

  performance: `You are a performance management expert. Analyze performance data, identify trends, 
    suggest improvement areas, and celebrate achievements. Help users understand performance metrics 
    in context and develop action plans for continuous improvement.`,

  team_dynamics: `You are an organizational psychologist and team development expert. Help users navigate 
    team challenges, improve communication, build trust, and enhance collaboration. Consider team composition, 
    roles, and individual strengths when providing advice.`,

  general: `You are a supportive leadership advisor. Provide balanced, thoughtful advice on leadership 
    challenges, decision-making, and professional development. Ask clarifying questions when needed 
    and consider multiple perspectives.`,
};

async function getContextualData(
  supabase: any,
  userId: string,
  teamId?: string
): Promise<string> {
  let context = "";

  // Get user profile
  const { data: user } = await supabase
    .from("users")
    .select("first_name, last_name, role, department")
    .eq("id", userId)
    .single();

  if (user) {
    context += `\nUser Profile: ${user.first_name} ${user.last_name}, Role: ${user.role}, Department: ${user.department}`;
  }

  // Get recent goals
  const { data: goals } = await supabase
    .from("goals")
    .select("title, status, completion_percentage")
    .eq("created_by_id", userId)
    .limit(3)
    .order("created_at", { ascending: false });

  if (goals && goals.length > 0) {
    context += "\nRecent Goals:";
    goals.forEach((goal: any) => {
      context += `\n- ${goal.title} (${goal.status}, ${goal.completion_percentage}% complete)`;
    });
  }

  // Get team info if provided
  if (teamId) {
    const { data: team } = await supabase
      .from("teams")
      .select("name, leader_id")
      .eq("id", teamId)
      .single();

    if (team) {
      context += `\nTeam: ${team.name}`;

      const { data: members } = await supabase
        .from("team_members")
        .select("user_id, role")
        .eq("team_id", teamId)
        .limit(10);

      if (members) {
        context += ` (${members.length} members)`;
      }
    }
  }

  // Get recent feedback received
  const { data: feedback } = await supabase
    .from("feedback")
    .select("feedback_type, rating, created_at")
    .eq("to_user_id", userId)
    .limit(5)
    .order("created_at", { ascending: false });

  if (feedback && feedback.length > 0) {
    const avgRating = (
      feedback.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) /
      feedback.length
    ).toFixed(1);
    context += `\nRecent Feedback: Average rating ${avgRating}/5 from ${feedback.length} responses`;
  }

  return context;
}

async function callOpenAI(
  messages: OpenAIMessage[],
  systemPrompt: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function logAIInteraction(
  supabase: any,
  userId: string,
  query: string,
  response: string,
  context: string
): Promise<void> {
  await supabase.from("ai_assistant_logs").insert({
    user_id: userId,
    query,
    response,
    context,
    tokens_used: query.length + response.length,
    created_at: new Date().toISOString(),
  });
}

async function generateSuggestions(
  supabase: any,
  userId: string
): Promise<string[]> {
  const suggestions: string[] = [];

  // Check for incomplete goals
  const { data: incompleteGoals } = await supabase
    .from("goals")
    .select("title, created_at")
    .eq("created_by_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (incompleteGoals && incompleteGoals.length > 0) {
    suggestions.push(
      `You have an active goal "${incompleteGoals[0].title}". Would you like help with a progress update or strategy adjustment?`
    );
  }

  // Check for pending feedback
  const { data: pendingFeedback } = await supabase
    .from("feedback")
    .select("id")
    .eq("to_user_id", userId)
    .eq("status", "pending")
    .limit(1);

  if (pendingFeedback && pendingFeedback.length > 0) {
    suggestions.push(
      "You have pending feedback to review. I can help you understand and act on it."
    );
  }

  // Check for upcoming meetings
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: upcomingMeetings } = await supabase
    .from("meetings")
    .select("title")
    .contains("start_time", tomorrow.toISOString().split("T")[0])
    .limit(1);

  if (upcomingMeetings && upcomingMeetings.length > 0) {
    suggestions.push(
      `You have a meeting tomorrow. Would you like help preparing an agenda or talking points?`
    );
  }

  return suggestions;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const payload: AIAssistantRequest = await req.json();

    // Validate required fields
    if (!payload.userId || !payload.query) {
      return new Response(
        JSON.stringify({ error: "Missing userId or query" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Determine context
    const context = payload.context || "general";
    const systemPrompt = systemPrompts[context];

    // Build message history
    const messages: OpenAIMessage[] = [
      ...(payload.messageHistory || []),
      { role: "user", content: payload.query },
    ];

    // Get contextual data
    const contextualData = await getContextualData(
      supabase,
      payload.userId,
      payload.teamId
    );

    // Enhance system prompt with contextual data
    const enhancedSystemPrompt = `${systemPrompt}\n\nContext about the user:${contextualData}`;

    // Call OpenAI API
    const assistantResponse = await callOpenAI(messages, enhancedSystemPrompt);

    // Log interaction
    await logAIInteraction(
      supabase,
      payload.userId,
      payload.query,
      assistantResponse,
      context
    );

    // Generate proactive suggestions
    const suggestions = await generateSuggestions(supabase, payload.userId);

    return new Response(
      JSON.stringify({
        success: true,
        response: assistantResponse,
        suggestions,
        context,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in AI Assistant:", error);

    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

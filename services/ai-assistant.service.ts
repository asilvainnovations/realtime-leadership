/**
 * AI Assistant Service - Client wrapper for Edge Function
 * Provides typed interface for interacting with AI Assistant
 */

import { supabase } from "../lib/supabase-client";

export interface AIAssistantRequest {
  userId: string;
  teamId?: string;
  query: string;
  context?:
    | "goal_setting"
    | "feedback"
    | "performance"
    | "team_dynamics"
    | "general";
  messageHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface AIAssistantResponse {
  success: boolean;
  response: string;
  suggestions: string[];
  context: string;
  error?: string;
}

class AIAssistantService {
  private functionUrl = "https://your-supabase-instance.functions.supabase.co";

  async chat(request: AIAssistantRequest): Promise<AIAssistantResponse> {
    const { data } = await supabase.auth.getSession();

    const response = await fetch(`${this.functionUrl}/ai-assistant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data?.session?.access_token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI Assistant error: ${response.statusText}`);
    }

    return response.json();
  }

  async getGoalSuggestions(userId: string, goalTitle: string): Promise<string> {
    const response = await this.chat({
      userId,
      context: "goal_setting",
      query: `Help me refine this goal: "${goalTitle}". Provide specific SMART criteria and suggestions for success metrics.`,
    });

    return response.response;
  }

  async analyzeFeedback(
    userId: string,
    feedbackContent: string,
    feedbackType: string
  ): Promise<string> {
    const response = await this.chat({
      userId,
      context: "feedback",
      query: `I received ${feedbackType} feedback: "${feedbackContent}". Help me understand this feedback and create an action plan.`,
    });

    return response.response;
  }

  async getPerformanceInsights(
    userId: string,
    metricName: string,
    metricValue: number
  ): Promise<string> {
    const response = await this.chat({
      userId,
      context: "performance",
      query: `My ${metricName} metric is at ${metricValue}. What does this mean for my performance and how can I improve?`,
    });

    return response.response;
  }

  async getTeamAdvice(
    userId: string,
    teamId: string,
    challenge: string
  ): Promise<string> {
    const response = await this.chat({
      userId,
      teamId,
      context: "team_dynamics",
      query: `Our team is facing this challenge: ${challenge}. What strategies would you recommend?`,
    });

    return response.response;
  }

  async askGeneral(userId: string, question: string): Promise<string> {
    const response = await this.chat({
      userId,
      context: "general",
      query: question,
    });

    return response.response;
  }
}

export const aiAssistantService = new AIAssistantService();

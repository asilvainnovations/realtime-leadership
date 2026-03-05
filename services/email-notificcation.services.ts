/**
 * Email Notification Service - Client wrapper
 * Handles sending various notification emails
 */

import { supabase } from "../lib/supabase-client";

export interface EmailNotificationPayload {
  userId: string;
  notificationType:
    | "feedback_received"
    | "goal_update"
    | "team_meeting"
    | "survey_request"
    | "achievement"
    | "team_invite"
    | "message_mention";
  recipientEmail: string;
  recipientName: string;
  data: Record<string, any>;
}

class EmailNotificationService {
  private functionUrl = "https://your-supabase-instance.functions.supabase.co";

  async sendNotification(
    payload: EmailNotificationPayload
  ): Promise<{ success: boolean; message: string }> {
    const { data } = await supabase.auth.getSession();

    const response = await fetch(`${this.functionUrl}/email-notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data?.session?.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Email notification error: ${response.statusText}`);
    }

    return response.json();
  }

  async notifyFeedbackReceived(
    userId: string,
    recipientEmail: string,
    recipientName: string,
    fromUserName: string,
    feedbackType: string,
    content: string,
    rating: number,
    feedbackId: string,
    baseUrl: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      notificationType: "feedback_received",
      recipientEmail,
      recipientName,
      data: {
        fromUserName,
        feedbackType,
        content,
        rating,
        feedbackId,
        baseUrl,
      },
    });
  }

  async notifyGoalUpdate(
    userId: string,
    recipientEmail: string,
    recipientName: string,
    goalTitle: string,
    status: string,
    completionPercentage: number,
    updatedByName: string,
    goalId: string,
    baseUrl: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      notificationType: "goal_update",
      recipientEmail,
      recipientName,
      data: {
        goalTitle,
        status,
        completionPercentage,
        updatedByName,
        goalId,
        baseUrl,
      },
    });
  }

  async notifyTeamMeeting(
    userId: string,
    recipientEmail: string,
    recipientName: string,
    meetingTitle: string,
    startTime: Date,
    duration: number,
    attendeeCount: number,
    meetingId: string,
    baseUrl: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      notificationType: "team_meeting",
      recipientEmail,
      recipientName,
      data: {
        meetingTitle,
        startTime,
        duration,
        attendeeCount,
        meetingId,
        baseUrl,
      },
    });
  }

  async notifySurveyRequest(
    userId: string,
    recipientEmail: string,
    recipientName: string,
    surveyTitle: string,
    description: string,
    dueDate: Date,
    estimatedTimeMinutes: number,
    surveyId: string,
    baseUrl: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      notificationType: "survey_request",
      recipientEmail,
      recipientName,
      data: {
        surveyTitle,
        description,
        dueDate,
        estimatedTimeMinutes,
        surveyId,
        baseUrl,
      },
    });
  }

  async notifyAchievement(
    userId: string,
    recipientEmail: string,
    recipientName: string,
    title: string,
    description: string,
    type: string,
    points: number
  ): Promise<void> {
    await this.sendNotification({
      userId,
      notificationType: "achievement",
      recipientEmail,
      recipientName,
      data: {
        title,
        description,
        type,
        points,
      },
    });
  }
}

export const emailNotificationService = new EmailNotificationService();

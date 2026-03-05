/**
 * Email Notification Edge Function
 * Handles transactional emails for the Real-Time Leadership platform
 * Deployed on Supabase Edge Functions or Cloudflare Workers
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface EmailNotificationPayload {
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

interface SendGridRequest {
  personalizations: Array<{
    to: Array<{ email: string; name: string }>;
    dynamic_template_data: Record<string, any>;
  }>;
  from: { email: string; name: string };
  template_id: string;
}

const emailTemplates: Record<string, string> = {
  feedback_received: "d-f1a2b3c4d5e6f7g8h9i0j",
  goal_update: "d-a1b2c3d4e5f6g7h8i9j0k",
  team_meeting: "d-m1n2o3p4q5r6s7t8u9v0w",
  survey_request: "d-s1u2r3v4e5y6r7e8q9u0e",
  achievement: "d-a1c2h3i4e5v6e7m8e9n0t",
  team_invite: "d-t1e2a3m4i5n6v7i8t9e0s",
  message_mention: "d-m1e2n3t4i5o6n7n8o9t0f",
};

async function sendEmailViaSendGrid(
  recipient: { email: string; name: string },
  templateId: string,
  templateData: Record<string, any>
): Promise<void> {
  const request: SendGridRequest = {
    personalizations: [
      {
        to: [{ email: recipient.email, name: recipient.name }],
        dynamic_template_data: templateData,
      },
    ],
    from: {
      email: "noreply@realtime-leadership.com",
      name: "Real-Time Leadership",
    },
    template_id: templateId,
  };

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid API error: ${response.status} - ${error}`);
  }
}

async function logEmailNotification(
  supabase: any,
  userId: string,
  notificationType: string,
  recipientEmail: string,
  status: "sent" | "failed",
  error?: string
): Promise<void> {
  await supabase.from("email_notification_logs").insert({
    user_id: userId,
    notification_type: notificationType,
    recipient_email: recipientEmail,
    status,
    error_message: error,
    created_at: new Date().toISOString(),
  });
}

async function buildEmailContent(
  notificationType: string,
  data: Record<string, any>
): Promise<Record<string, any>> {
  switch (notificationType) {
    case "feedback_received":
      return {
        feedback_from: data.fromUserName,
        feedback_type: data.feedbackType,
        feedback_content: data.content,
        feedback_rating: data.rating,
        action_url: `${data.baseUrl}/feedback/${data.feedbackId}`,
      };

    case "goal_update":
      return {
        goal_title: data.goalTitle,
        goal_status: data.status,
        completion_percentage: data.completionPercentage,
        updated_by: data.updatedByName,
        action_url: `${data.baseUrl}/goals/${data.goalId}`,
      };

    case "team_meeting":
      return {
        meeting_title: data.meetingTitle,
        meeting_time: new Date(data.startTime).toLocaleString(),
        meeting_duration: data.duration,
        attendees_count: data.attendeeCount,
        action_url: `${data.baseUrl}/meetings/${data.meetingId}`,
      };

    case "survey_request":
      return {
        survey_title: data.surveyTitle,
        survey_description: data.description,
        due_date: new Date(data.dueDate).toLocaleDateString(),
        estimated_time: data.estimatedTimeMinutes,
        action_url: `${data.baseUrl}/surveys/${data.surveyId}`,
      };

    case "achievement":
      return {
        achievement_title: data.title,
        achievement_description: data.description,
        achievement_type: data.type,
        points_earned: data.points,
      };

    case "team_invite":
      return {
        team_name: data.teamName,
        invited_by: data.invitedByName,
        team_description: data.teamDescription,
        action_url: `${data.baseUrl}/invites/${data.inviteToken}`,
      };

    case "message_mention":
      return {
        mentioned_by: data.fromUserName,
        message_preview: data.messageContent.substring(0, 100),
        channel_name: data.channelName,
        action_url: `${data.baseUrl}/messages/${data.messageId}`,
      };

    default:
      return data;
  }
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
    const payload: EmailNotificationPayload = await req.json();

    // Validate required fields
    if (
      !payload.userId ||
      !payload.notificationType ||
      !payload.recipientEmail ||
      !payload.recipientName
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check user's email notification preferences
    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("email_notifications")
      .eq("user_id", payload.userId)
      .single();

    if (preferences && !preferences.email_notifications) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email notifications disabled for user",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Build email content
    const emailContent = await buildEmailContent(
      payload.notificationType,
      payload.data
    );

    // Get template ID
    const templateId = emailTemplates[payload.notificationType];
    if (!templateId) {
      throw new Error(`Unknown notification type: ${payload.notificationType}`);
    }

    // Send email via SendGrid
    await sendEmailViaSendGrid(
      { email: payload.recipientEmail, name: payload.recipientName },
      templateId,
      emailContent
    );

    // Log successful notification
    await logEmailNotification(
      supabase,
      payload.userId,
      payload.notificationType,
      payload.recipientEmail,
      "sent"
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending email notification:", error);

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

-- Real-Time Leadership Application Database Schema
-- Created: 2026-03-04

-- ============================================================================
-- CORE USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_image_url TEXT,
    bio TEXT,
    department VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_status (status)
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    refresh_token VARCHAR(500),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
);

-- ============================================================================
-- ORGANIZATIONS & TEAMS
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    owner_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    INDEX idx_owner_id (owner_id),
    INDEX idx_slug (slug)
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    leader_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    INDEX idx_organization_id (organization_id),
    INDEX idx_leader_id (leader_id)
);

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id),
    INDEX idx_team_id (team_id),
    INDEX idx_user_id (user_id)
);

-- ============================================================================
-- REAL-TIME LEADERSHIP METRICS & GOALS
-- ============================================================================

CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    created_by_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    priority VARCHAR(20) DEFAULT 'medium',
    target_date DATE,
    completion_percentage INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    INDEX idx_organization_id (organization_id),
    INDEX idx_team_id (team_id),
    INDEX idx_status (status),
    INDEX idx_target_date (target_date)
);

CREATE TABLE goal_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    updated_by_id UUID NOT NULL REFERENCES users(id),
    update_type VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_goal_id (goal_id),
    INDEX idx_updated_by_id (updated_by_id),
    INDEX idx_created_at (created_at)
);

CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    metric_name VARCHAR(200) NOT NULL,
    metric_value DECIMAL(10, 2),
    unit VARCHAR(50),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_team_id (team_id),
    INDEX idx_metric_name (metric_name),
    INDEX idx_period_start (period_start)
);

-- ============================================================================
-- FEEDBACK & COMMUNICATION
-- ============================================================================

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    team_id UUID REFERENCES teams(id),
    feedback_type VARCHAR(50),
    content TEXT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    is_anonymous BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    INDEX idx_from_user_id (from_user_id),
    INDEX idx_to_user_id (to_user_id),
    INDEX idx_team_id (team_id),
    INDEX idx_status (status)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    team_id UUID REFERENCES teams(id),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    INDEX idx_from_user_id (from_user_id),
    INDEX idx_to_user_id (to_user_id),
    INDEX idx_team_id (team_id),
    INDEX idx_created_at (created_at)
);

-- ============================================================================
-- REAL-TIME NOTIFICATIONS & ACTIVITY
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    content TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    team_id UUID REFERENCES teams(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_organization_id (organization_id),
    INDEX idx_team_id (team_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- ============================================================================
-- REAL-TIME PRESENCE & STATUS
-- ============================================================================

CREATE TABLE user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'offline',
    current_view VARCHAR(255),
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);

-- ============================================================================
-- MEETINGS & EVENTS
-- ============================================================================

CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    team_id UUID REFERENCES teams(id),
    created_by_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    meeting_url TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_organization_id (organization_id),
    INDEX idx_team_id (team_id),
    INDEX idx_start_time (start_time),
    INDEX idx_status (status)
);

CREATE TABLE meeting_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    attendance_status VARCHAR(50) DEFAULT 'pending',
    joined_at TIMESTAMP,
    UNIQUE(meeting_id, user_id),
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_user_id (user_id)
);

-- ============================================================================
-- SURVEYS & FEEDBACK FORMS
-- ============================================================================

CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_by_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_organization_id (organization_id),
    INDEX idx_status (status)
);

CREATE TABLE survey_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50),
    options JSONB,
    is_required BOOLEAN DEFAULT TRUE,
    order_index INT,
    INDEX idx_survey_id (survey_id)
);

CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id),
    question_id UUID NOT NULL REFERENCES survey_questions(id),
    respondent_id UUID REFERENCES users(id),
    response_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_survey_id (survey_id),
    INDEX idx_question_id (question_id),
    INDEX idx_respondent_id (respondent_id)
);

-- ============================================================================
-- DOCUMENTS & RESOURCES
-- ============================================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    team_id UUID REFERENCES teams(id),
    created_by_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    document_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft',
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    INDEX idx_organization_id (organization_id),
    INDEX idx_team_id (team_id),
    INDEX idx_status (status)
);

-- ============================================================================
-- SETTINGS & PREFERENCES
-- ============================================================================

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50),
    weekly_digest BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
);

-- ============================================================================
-- AUDIT & COMPLIANCE
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    status VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

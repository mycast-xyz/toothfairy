-- Calendar Events Table for PostgreSQL
-- Supports tui.calendar data model and team-based separation via calendar_id

CREATE TABLE IF NOT EXISTS tb_calendar_events (
    id SERIAL PRIMARY KEY,
    calendar_id VARCHAR(50) NOT NULL, -- To distinguish between different calendars (e.g., '1' for Team A, '2' for Team B)
    title VARCHAR(255) NOT NULL,
    body TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL, -- 'start' is a reserved keyword in some contexts, using start_time is safer, but tui expects 'start'. Mapping will be needed in API or Service. Let's use 'start_time' in DB.
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,   -- 'end' is reserved.
    is_all_day BOOLEAN DEFAULT FALSE,
    category VARCHAR(20) DEFAULT 'time', -- 'time', 'allday', 'milestone', 'task'
    location VARCHAR(255),
    state VARCHAR(20) DEFAULT 'Busy', -- 'Busy', 'Free'
    
    -- Style properties
    color VARCHAR(20),
    bg_color VARCHAR(20),
    drag_bg_color VARCHAR(20),
    border_color VARCHAR(20),
    
    -- Metadata
    attendees TEXT[], -- Array of strings for attendee names or IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster range queries
CREATE INDEX idx_calendar_events_dates ON tb_calendar_events (start_time, end_time);
CREATE INDEX idx_calendar_events_calendar_id ON tb_calendar_events (calendar_id);

-- Comment on table
COMMENT ON TABLE tb_calendar_events IS 'Stores calendar events for tui.calendar integration';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calendar_events_modtime
    BEFORE UPDATE ON tb_calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

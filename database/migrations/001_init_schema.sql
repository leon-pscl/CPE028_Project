-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create staging schema
CREATE SCHEMA IF NOT EXISTS staging;

-- Users table (extends auth.users via trigger)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'consumer' CHECK (role IN ('consumer', 'shop_admin', 'verifier', 'super_admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices table for device catalog
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('smartphone', 'laptop', 'tablet')),
    release_date DATE,
    repairability_index INTEGER CHECK (repairability_index BETWEEN 0 AND 10),
    typical_lifespan_months INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand, model)
);

-- Scoring configuration table
CREATE TABLE IF NOT EXISTS public.scoring_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factor_name TEXT NOT NULL UNIQUE,
    weight DECIMAL(3,2) NOT NULL CHECK (weight >= 0 AND weight <= 1),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessments table
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Nullable for anonymous users
    device_id UUID REFERENCES public.devices(id),
    device_age_months INTEGER NOT NULL,
    issue_severity INTEGER NOT NULL CHECK (issue_severity BETWEEN 1 AND 3),
    parts_availability INTEGER NOT NULL CHECK (parts_availability BETWEEN 0 AND 3),
    repairability_idx INTEGER NOT NULL CHECK (repairability_idx BETWEEN 0 AND 10),
    cost_ratio DECIMAL(3,2) NOT NULL,
    manufacturer_support BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repair scores table
CREATE TABLE IF NOT EXISTS public.repair_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID UNIQUE REFERENCES public.assessments(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('REPAIR', 'RECYCLE')),
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    confidence TEXT CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
    probability DECIMAL(3,2),
    feature_vector JSONB,
    feature_importances JSONB,
    ml_model_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost estimates table
CREATE TABLE IF NOT EXISTS public.cost_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID UNIQUE REFERENCES public.assessments(id) ON DELETE CASCADE,
    min_cost DECIMAL(10,2),
    max_cost DECIMAL(10,2),
    currency TEXT DEFAULT 'PHP',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guides table for repair/recycling guides
CREATE TABLE IF NOT EXISTS public.guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    guide_type TEXT NOT NULL CHECK (guide_type IN ('repair', 'recycle', 'data_wipe')),
    device_type TEXT CHECK (device_type IN ('smartphone', 'laptop')),
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist completions table
CREATE TABLE IF NOT EXISTS public.checklist_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, step_id)
);

-- Shops table for repair shops
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    geom GEOMETRY(Point, 4326),
    phone TEXT,
    website TEXT,
    hours TEXT,
    brands_serviced TEXT[], -- Array of brands they service
    type TEXT NOT NULL DEFAULT 'repair' CHECK (type IN ('repair', 'recycling')),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facilities table for recycling facilities
CREATE TABLE IF NOT EXISTS public.facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    geom GEOMETRY(Point, 4326),
    phone TEXT,
    website TEXT,
    hours TEXT,
    accepted_items TEXT[], -- Array of accepted e-waste items
    certifications TEXT[], -- Array of certifications
    type TEXT NOT NULL DEFAULT 'recycling' CHECK (type IN ('recycling', 'ewaste', 'refurbishment')),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification tasks table
CREATE TABLE IF NOT EXISTS public.verification_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
    source TEXT NOT NULL CHECK (source IN ('google_places', 'manual', 'facebook')),
    place_id TEXT, -- Google Places place_id
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_by UUID REFERENCES public.users(id),
    reviewed_by UUID REFERENCES public.users(id),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outcome followups table
CREATE TABLE IF NOT EXISTS public.outcome_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_confirmed_outcome TEXT NOT NULL CHECK (user_confirmed_outcome IN ('REPAIR', 'RECYCLE', 'NO_ACTION')),
    actual_cost DECIMAL(10,2),
    service_provider TEXT,
    satisfaction INTEGER CHECK (satisfaction BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impact events table
CREATE TABLE IF NOT EXISTS public.impact_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('assessment_completed', 'roadmap_completed', 'outcome_confirmed')),
    sdg_contribution JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ML models table
CREATE TABLE IF NOT EXISTS public.ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    model_type TEXT NOT NULL CHECK (model_type IN ('clustering', 'classifier')),
    file_path TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    accuracy DECIMAL(3,2),
    training_data_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, version)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON public.assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON public.assessments(created_at);
CREATE INDEX IF NOT EXISTS idx_repair_scores_assessment_id ON public.repair_scores(assessment_id);
CREATE INDEX IF NOT EXISTS idx_cost_estimates_assessment_id ON public.cost_estimates(assessment_id);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_assessment_id ON public.checklist_completions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_shops_geom ON public.shops USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_facilities_geom ON public.facilities USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_verification_tasks_status ON public.verification_tasks(status);
CREATE INDEX IF NOT EXISTS idx_outcome_followups_assessment_id ON public.outcome_followups(assessment_id);
CREATE INDEX IF NOT EXISTS idx_impact_events_assessment_id ON public.impact_events(assessment_id);
CREATE INDEX IF NOT EXISTS idx_ml_models_is_active ON public.ml_models(is_active);

-- Storage buckets need to be created via Supabase dashboard or management API
-- Required buckets: guides (public) and cert-docs (private)

-- Create function for assessment transaction
DROP FUNCTION IF EXISTS public.create_assessment_tx;
CREATE OR REPLACE FUNCTION public.create_assessment_tx(
    p_user_id UUID,
    p_device_id UUID,
    p_device_age_months INTEGER,
    p_issue_severity INTEGER,
    p_parts_availability INTEGER,
    p_repairability_idx INTEGER,
    p_cost_ratio DECIMAL,
    p_manufacturer_support BOOLEAN,
    p_direction TEXT,
    p_score INTEGER,
    p_confidence TEXT,
    p_probability DECIMAL,
    p_feature_vector JSONB,
    p_feature_importances JSONB,
    p_ml_model_id UUID,
    p_min_cost DECIMAL,
    p_max_cost DECIMAL,
    p_currency TEXT DEFAULT 'PHP'
)
RETURNS UUID AS $$
DECLARE
    v_assessment_id UUID;
BEGIN
    -- Start transaction
    BEGIN
        -- Insert assessment
        INSERT INTO public.assessments (
            user_id, device_id, device_age_months, issue_severity, 
            parts_availability, repairability_idx, cost_ratio, manufacturer_support
        ) VALUES (
            p_user_id, p_device_id, p_device_age_months, p_issue_severity,
            p_parts_availability, p_repairability_idx, p_cost_ratio, p_manufacturer_support
        )
        RETURNING id INTO v_assessment_id;

        -- Insert repair score
        INSERT INTO public.repair_scores (
            assessment_id, direction, score, confidence, probability, 
            feature_vector, feature_importances, ml_model_id
        ) VALUES (
            v_assessment_id, p_direction, p_score, p_confidence, p_probability,
            p_feature_vector, p_feature_importances, p_ml_model_id
        );

        -- Insert cost estimate
        INSERT INTO public.cost_estimates (
            assessment_id, min_cost, max_cost, currency
        ) VALUES (
            v_assessment_id, p_min_cost, p_max_cost, p_currency
        );

        -- Return the assessment ID
        RETURN v_assessment_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback will happen automatically due to exception
            RAISE EXCEPTION 'Failed to create assessment: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.create_assessment_tx TO anon, authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
DO $$ 
DECLARE
    tables CURSOR FOR
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'devices', 'scoring_config', 'guides', 'shops', 'facilities', 'verification_tasks', 'ml_models');
BEGIN
    FOR table_record IN tables LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I;
             CREATE TRIGGER update_%I_updated_at 
             BEFORE UPDATE ON public.%I 
             FOR EACH ROW 
             EXECUTE FUNCTION public.update_updated_at_column();',
            table_record.tablename, table_record.tablename,
            table_record.tablename, table_record.tablename
        );
    END LOOP;
END $$;

-- Insert initial scoring configuration weights (from AGENT_TASKS_v3.md)
INSERT INTO public.scoring_config (factor_name, weight, description) VALUES
    ('age', 0.20, 'Device age in months'),
    ('issue_severity', 0.30, 'Severity of the issue (1-3)'),
    ('cost_ratio', 0.25, 'Ratio of repair cost to device value'),
    ('parts_availability', 0.15, 'Availability of replacement parts (0-3)'),
    ('manufacturer_support', 0.10, 'Whether manufacturer still supports the device')
ON CONFLICT (factor_name) DO NOTHING;

-- Insert some sample devices (Philippine market devices)
INSERT INTO public.devices (brand, model, device_type, release_date, repairability_index, typical_lifespan_months) VALUES
    ('Samsung', 'Galaxy A54', 'smartphone', '2023-03-01', 8, 36),
    ('Samsung', 'Galaxy A34', 'smartphone', '2023-03-01', 7, 36),
    ('OPPO', 'A57', 'smartphone', '2022-06-01', 6, 30),
    ('OPPO', 'A77', 'smartphone', '2022-06-01', 6, 30),
    ('Xiaomi', 'Redmi Note 12', 'smartphone', '2022-10-01', 7, 36),
    ('Vivo', 'Y78', 'smartphone', '2023-02-01', 6, 30),
    ('Apple', 'iPhone 13', 'smartphone', '2021-09-01', 5, 48),
    ('Apple', 'iPhone 14', 'smartphone', '2022-09-01', 5, 48),
    ('Apple', 'iPhone 15', 'smartphone', '2023-09-01', 5, 48),
    ('Lenovo', 'IdeaPad 3', 'laptop', '2022-01-01', 6, 60),
    ('HP', 'Pavilion 15', 'laptop', '2022-03-01', 5, 60),
    ('ASUS', 'Vivobook 15', 'laptop', '2022-02-01', 6, 60),
    ('Dell', 'Inspiron 15', 'laptop', '2022-01-01', 5, 60),
    ('Acer', 'Aspire 5', 'laptop', '2022-04-01', 5, 60)
ON CONFLICT DO NOTHING;
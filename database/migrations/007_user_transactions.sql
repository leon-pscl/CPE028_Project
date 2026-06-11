CREATE TABLE IF NOT EXISTS public.user_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'ASSESSMENT_CREATED', 'ROADMAP_COMPLETED', 'SHOP_SUBMITTED'
    )),
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_transactions_user_created
    ON public.user_transactions (user_id, created_at DESC);

ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
    ON public.user_transactions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
    ON public.user_transactions FOR INSERT
    WITH CHECK (user_id = auth.uid());

GRANT ALL ON public.user_transactions TO authenticated;

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
    p_probability DECIMAL DEFAULT NULL,
    p_feature_vector JSONB DEFAULT NULL,
    p_feature_importances JSONB DEFAULT NULL,
    p_ml_model_id UUID DEFAULT NULL,
    p_min_cost DECIMAL DEFAULT NULL,
    p_max_cost DECIMAL DEFAULT NULL,
    p_currency TEXT DEFAULT 'PHP'
)
RETURNS UUID AS $$
DECLARE
    v_assessment_id UUID;
BEGIN
    INSERT INTO public.assessments (
        user_id, device_id, device_age_months, issue_severity,
        parts_availability, repairability_idx, cost_ratio, manufacturer_support
    ) VALUES (
        p_user_id, p_device_id, p_device_age_months, p_issue_severity,
        p_parts_availability, p_repairability_idx, p_cost_ratio, p_manufacturer_support
    )
    RETURNING id INTO v_assessment_id;

    INSERT INTO public.repair_scores (
        assessment_id, direction, score, confidence, probability,
        feature_vector, feature_importances, ml_model_id
    ) VALUES (
        v_assessment_id, p_direction, p_score, p_confidence, p_probability,
        p_feature_vector, p_feature_importances, p_ml_model_id
    );

    INSERT INTO public.cost_estimates (
        assessment_id, min_cost, max_cost, currency
    ) VALUES (
        v_assessment_id, p_min_cost, p_max_cost, p_currency
    );

    INSERT INTO public.user_transactions (
        user_id, event_type, payload
    ) VALUES (
        p_user_id, 'ASSESSMENT_CREATED',
        jsonb_build_object(
            'assessment_id', v_assessment_id,
            'direction', p_direction,
            'score', p_score,
            'device_id', p_device_id
        )
    );

    RETURN v_assessment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_assessment_tx TO anon, authenticated;

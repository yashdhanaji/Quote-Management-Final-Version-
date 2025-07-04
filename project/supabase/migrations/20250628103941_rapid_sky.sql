/*
  # Dashboard Analytics Functions

  1. Functions
    - Get dashboard statistics
    - Get monthly quote trends
    - Get top clients by quote value
    - Get quote status breakdown

  2. Security
    - Organization-scoped data access
    - Role-based permissions
*/

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats(org_id uuid)
RETURNS json AS $$
DECLARE
  stats json;
  total_quotes integer;
  total_value decimal;
  pending_approval integer;
  approved_quotes integer;
  sent_quotes integer;
  draft_quotes integer;
  current_month_start date;
  last_month_start date;
  current_month_value decimal;
  last_month_value decimal;
  value_change decimal;
BEGIN
  -- Check if user belongs to organization
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Calculate date ranges
  current_month_start := date_trunc('month', CURRENT_DATE);
  last_month_start := current_month_start - interval '1 month';
  
  -- Get basic counts
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0),
    COUNT(*) FILTER (WHERE status = 'pending_approval'),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'sent'),
    COUNT(*) FILTER (WHERE status = 'draft')
  INTO 
    total_quotes, total_value, pending_approval, 
    approved_quotes, sent_quotes, draft_quotes
  FROM quotes 
  WHERE organization_id = org_id;
  
  -- Get monthly value comparison
  SELECT COALESCE(SUM(total_amount), 0)
  INTO current_month_value
  FROM quotes 
  WHERE organization_id = org_id 
  AND created_at >= current_month_start;
  
  SELECT COALESCE(SUM(total_amount), 0)
  INTO last_month_value
  FROM quotes 
  WHERE organization_id = org_id 
  AND created_at >= last_month_start 
  AND created_at < current_month_start;
  
  -- Calculate percentage change
  IF last_month_value > 0 THEN
    value_change := ((current_month_value - last_month_value) / last_month_value) * 100;
  ELSE
    value_change := 0;
  END IF;
  
  stats := json_build_object(
    'total_quotes', total_quotes,
    'total_value', total_value,
    'pending_approval', pending_approval,
    'approved_quotes', approved_quotes,
    'sent_quotes', sent_quotes,
    'draft_quotes', draft_quotes,
    'current_month_value', current_month_value,
    'last_month_value', last_month_value,
    'value_change_percent', ROUND(value_change, 1)
  );
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly trends
CREATE OR REPLACE FUNCTION get_monthly_trends(org_id uuid, months_back integer DEFAULT 6)
RETURNS json AS $$
DECLARE
  trends json;
BEGIN
  -- Check if user belongs to organization
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT json_agg(
    json_build_object(
      'month', TO_CHAR(month_date, 'Mon YYYY'),
      'value', COALESCE(total_value, 0),
      'count', COALESCE(quote_count, 0)
    ) ORDER BY month_date
  )
  INTO trends
  FROM (
    SELECT 
      date_trunc('month', generate_series(
        CURRENT_DATE - (months_back || ' months')::interval,
        CURRENT_DATE,
        '1 month'::interval
      )) AS month_date
  ) months
  LEFT JOIN (
    SELECT 
      date_trunc('month', created_at) AS month,
      SUM(total_amount) AS total_value,
      COUNT(*) AS quote_count
    FROM quotes 
    WHERE organization_id = org_id
    GROUP BY date_trunc('month', created_at)
  ) quote_data ON months.month_date = quote_data.month;
  
  RETURN trends;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top clients
CREATE OR REPLACE FUNCTION get_top_clients(org_id uuid, limit_count integer DEFAULT 5)
RETURNS json AS $$
DECLARE
  top_clients json;
BEGIN
  -- Check if user belongs to organization
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT json_agg(
    json_build_object(
      'client_name', c.name,
      'total_value', COALESCE(q.total_value, 0),
      'quote_count', COALESCE(q.quote_count, 0)
    ) ORDER BY COALESCE(q.total_value, 0) DESC
  )
  INTO top_clients
  FROM clients c
  LEFT JOIN (
    SELECT 
      client_id,
      SUM(total_amount) AS total_value,
      COUNT(*) AS quote_count
    FROM quotes 
    WHERE organization_id = org_id
    GROUP BY client_id
  ) q ON c.id = q.client_id
  WHERE c.organization_id = org_id
  ORDER BY COALESCE(q.total_value, 0) DESC
  LIMIT limit_count;
  
  RETURN top_clients;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get quote status breakdown
CREATE OR REPLACE FUNCTION get_quote_status_breakdown(org_id uuid)
RETURNS json AS $$
DECLARE
  status_breakdown json;
BEGIN
  -- Check if user belongs to organization
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT json_agg(
    json_build_object(
      'status', status,
      'count', count,
      'value', total_value
    )
  )
  INTO status_breakdown
  FROM (
    SELECT 
      status,
      COUNT(*) as count,
      SUM(total_amount) as total_value
    FROM quotes 
    WHERE organization_id = org_id
    GROUP BY status
  ) breakdown;
  
  RETURN status_breakdown;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
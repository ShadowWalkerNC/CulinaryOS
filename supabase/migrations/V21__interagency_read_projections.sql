-- Narrow server-only projections. No customer, card, payment or employee identities.
BEGIN;
CREATE FUNCTION public.interagency_sales_summary(p_tenant_id uuid,p_offset integer,p_limit integer)
RETURNS TABLE(id text,day date,menu_item_id uuid,sold_units numeric,line_revenue_cents bigint,currency text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT (o.paid_at::date)::text||':'||li.menu_item_id::text,o.paid_at::date,li.menu_item_id,
        sum(li.qty)::numeric,sum(li.line_total)::bigint,to_jsonb(t)->>'currency'
 FROM public.pos_orders o JOIN public.pos_order_line_items li ON li.order_id=o.id
 JOIN public.tenants t ON t.id=o.tenant_id
 WHERE o.tenant_id=p_tenant_id AND o.status='paid' AND o.paid_at IS NOT NULL
 GROUP BY o.paid_at::date,li.menu_item_id,to_jsonb(t)->>'currency'
 ORDER BY o.paid_at::date,li.menu_item_id
 OFFSET greatest(0,p_offset) LIMIT least(201,greatest(1,p_limit));
$$;
CREATE FUNCTION public.interagency_recipe_snapshot(p_tenant_id uuid,p_offset integer,p_limit integer)
RETURNS TABLE(id uuid,name text,yield_unit text,base_yield_portions numeric,updated_at timestamptz,ingredients jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT r.id,r.name,r.yield_unit,r.base_yield_portions,r.updated_at,
  COALESCE((SELECT jsonb_agg(jsonb_build_object(
   'id',ri.id,'ingredientId',to_jsonb(ri)->'ingredient_id','ingredientName',to_jsonb(ri)->'ingredient_name',
   'quantity',to_jsonb(ri)->'quantity','unit',to_jsonb(ri)->'unit','ratioPercentage',to_jsonb(ri)->'ratio_percentage'
  ) ORDER BY ri.id) FROM public.recipe_ingredients ri WHERE ri.recipe_id=r.id AND
   ((to_jsonb(ri)->>'ingredient_id') IS NULL OR EXISTS(SELECT 1 FROM public.ingredients i WHERE i.id::text=to_jsonb(ri)->>'ingredient_id' AND i.tenant_id=p_tenant_id))),'[]'::jsonb)
 FROM public.recipes r WHERE r.tenant_id=p_tenant_id ORDER BY r.id
 OFFSET greatest(0,p_offset) LIMIT least(201,greatest(1,p_limit));
$$;
REVOKE ALL ON FUNCTION public.interagency_sales_summary(uuid,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.interagency_recipe_snapshot(uuid,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interagency_sales_summary(uuid,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.interagency_recipe_snapshot(uuid,integer,integer) TO service_role;
COMMIT;

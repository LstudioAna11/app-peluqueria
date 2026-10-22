-- F1: the service_role key must never be reachable from the browser.
REVOKE ALL ON FUNCTION public.studio_dispatch_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.studio_dispatch_request() FROM anon;
REVOKE ALL ON FUNCTION public.studio_dispatch_request() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.studio_dispatch_request() TO service_role;
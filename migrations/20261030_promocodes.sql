BEGIN;

CREATE TABLE IF NOT EXISTS public."PromoCode" (
  id bigserial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  "discountType" text NOT NULL CHECK ("discountType" IN ('percent', 'fixed')),
  "discountValue" integer NOT NULL CHECK ("discountValue" > 0 AND "discountValue" <= 10000000),
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CHECK (code = upper(btrim(code)) AND char_length(code) BETWEEN 2 AND 40),
  CHECK ("discountType" <> 'percent' OR "discountValue" <= 100)
);

-- Codes can only be managed and validated through server endpoints.
ALTER TABLE public."PromoCode" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."PromoCode" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public."PromoCode_id_seq" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."PromoCode" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public."PromoCode_id_seq" TO service_role;

-- Store a snapshot so code changes/deletion do not change existing orders.
ALTER TABLE public."Order" ADD COLUMN IF NOT EXISTS "promoCode" text;
ALTER TABLE public."Order" ADD COLUMN IF NOT EXISTS "promoDiscount" integer NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
COMMIT;

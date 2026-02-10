-- Fix existing transactions that are stuck in PENDING
UPDATE public.transactions 
SET status = 'COMPLETED', 
    structure_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 
    credits_purchased = 25 
WHERE id IN ('743c7678-e0a9-447b-8d28-c786a0cc9609', 'd4d065df-eee2-4eb1-93ef-5eefb7544346')
AND transaction_type = 'CREDIT_TOPUP';

-- Create wallet entries for the user (2 x 25 credits = 50 total)
INSERT INTO public.structure_wallets (user_id, structure_id, balance)
VALUES ('2d0e80af-3ff7-4500-870c-aea63201254f', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 50)
ON CONFLICT DO NOTHING;
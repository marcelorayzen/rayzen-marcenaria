-- Decided 11/11/2026: the client confirms the project with the representative
-- by contract, WhatsApp or e-mail; the representative records that evidence as
-- the commercial approval of the exact revision. 'sistema_comercial' is kept
-- for compatibility with any existing row.
alter type public.approval_channel add value if not exists 'contrato';
alter type public.approval_channel add value if not exists 'email';

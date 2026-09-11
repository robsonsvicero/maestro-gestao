-- Execute este script APÓS excluir as licenças expiradas indevidas.
-- Ele impede que a tabela central de licenças tenha mais de um registro
-- para o mesmo e-mail, ignorando diferenças de maiúsculas e espaços.

create unique index if not exists entitlements_email_unique
  on public.entitlements (lower(btrim(email)))
  where email is not null;

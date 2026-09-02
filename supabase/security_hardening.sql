-- Execute uma vez se a versão anterior de user_data_rls.sql já foi aplicada.
-- Impede que um cliente altere o próprio campo profiles.role pelo navegador.

drop policy if exists profiles_update_own on public.profiles;

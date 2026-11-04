-- O candidato pode retirar a candidatura enquanto estiver "Recebida" ou "Em análise". Pode ser repetido.
drop policy if exists app_cand_delete on applications;
create policy app_cand_delete on applications for delete using (candidate_id = auth.uid() and status in ('submitted','in_review'));

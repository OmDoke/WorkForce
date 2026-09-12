create or replace function is_admin()
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  return exists(select 1 from profiles where id = auth.uid() and role = 'admin');
end;
$$;

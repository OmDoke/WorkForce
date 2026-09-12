create policy "Workers can insert own worker row" on workers for insert with check (auth.uid() = profile_id);

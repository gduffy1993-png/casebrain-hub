alter table public.mail_messages
add column auto_reply jsonb default null,
add column opponent_name text,
add column opponent_email text,
add column requires_follow_up boolean default false;


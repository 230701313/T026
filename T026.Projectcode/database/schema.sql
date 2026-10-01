-- =============================================================================
-- AI-Powered Intelligent Lost and Found System — Database Schema
-- Target: PostgreSQL via Supabase
--
-- Run this in the Supabase SQL editor (or `supabase db push` with the CLI)
-- after creating a new Supabase project. Requires Supabase Auth to already
-- be enabled (it is, by default).
-- =============================================================================

-- Optional: enables vector similarity search for stored image embeddings
-- (Phase 3+). Safe to run even if not used yet. Skip if your Supabase plan
-- does not support the pgvector extension.
create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- 1. PROFILES
-- Extra profile info alongside Supabase's built-in auth.users table.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    full_name   text not null,
    email       text not null,
    phone       text,
    created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created, so the
-- frontend's explicit upsert (in useAuth.tsx) is a safety net, not the only path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, email)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
        new.email
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 2. ITEMS (lost + found reports)
-- -----------------------------------------------------------------------------
create table if not exists public.items (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users (id) on delete cascade,
    report_type     text not null check (report_type in ('LOST', 'FOUND')),
    item_name       text not null,
    category        text not null check (category in (
                        'Electronics', 'Personal Items', 'Documents', 'Accessories',
                        'Clothing', 'Books', 'Keys', 'Bags', 'Other'
                    )),
    description     text not null,
    location        text not null,
    date_reported   date not null,
    image_url       text,
    -- Phase 3: cached CLIP/OpenCLIP image embedding, reused instead of
    -- recomputed on every match run. Nullable until Phase 3 is implemented.
    image_embedding vector(512),
    -- Phase 4: cached sentence-transformer text embedding.
    text_embedding  vector(384),
    status          text not null default 'ACTIVE' check (status in (
                        'ACTIVE', 'MATCHED', 'CLAIMED', 'RECOVERED', 'CLOSED'
                    )),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists items_user_id_idx on public.items (user_id);
create index if not exists items_report_type_idx on public.items (report_type);
create index if not exists items_status_idx on public.items (status);

alter table public.items enable row level security;

create policy "Anyone authenticated can view active items"
    on public.items for select
    using (auth.role() = 'authenticated');

create policy "Users can insert their own items"
    on public.items for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own items"
    on public.items for update
    using (auth.uid() = user_id);

create policy "Users can delete their own items"
    on public.items for delete
    using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
    before update on public.items
    for each row execute procedure public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 3. MATCHES  (Phase 5 — Hybrid Matching)
-- -----------------------------------------------------------------------------
create table if not exists public.matches (
    id                  uuid primary key default gen_random_uuid(),
    lost_item_id        uuid not null references public.items (id) on delete cascade,
    found_item_id       uuid not null references public.items (id) on delete cascade,
    image_similarity    numeric(5, 2) not null,
    text_similarity     numeric(5, 2) not null,
    location_similarity numeric(5, 2) not null,
    date_similarity     numeric(5, 2) not null,
    final_score         numeric(5, 2) not null,
    match_status        text not null default 'POTENTIAL' check (match_status in (
                            'POTENTIAL', 'CONFIRMED', 'REJECTED'
                        )),
    created_at          timestamptz not null default now(),
    unique (lost_item_id, found_item_id)
);

create index if not exists matches_lost_item_idx on public.matches (lost_item_id);
create index if not exists matches_found_item_idx on public.matches (found_item_id);
create index if not exists matches_final_score_idx on public.matches (final_score desc);

alter table public.matches enable row level security;

create policy "Users can view matches involving their own items"
    on public.matches for select
    using (
        exists (select 1 from public.items i where i.id = lost_item_id and i.user_id = auth.uid())
        or exists (select 1 from public.items i where i.id = found_item_id and i.user_id = auth.uid())
    );

-- Matches are written by the backend using the service-role key (bypasses
-- RLS) so that "the frontend cannot decide the final match score" — no
-- insert/update policy is granted to regular authenticated users here.


-- -----------------------------------------------------------------------------
-- 4. NOTIFICATIONS  (Phase 6)
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users (id) on delete cascade,
    match_id    uuid references public.matches (id) on delete set null,
    title       text not null,
    message     text not null,
    is_read     boolean not null default false,
    created_at  timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);

create policy "Users can mark their own notifications as read"
    on public.notifications for update
    using (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 5. CLAIMS  (Phase 7 — Ownership Verification)
-- -----------------------------------------------------------------------------
create table if not exists public.claims (
    id                    uuid primary key default gen_random_uuid(),
    item_id               uuid not null references public.items (id) on delete cascade,
    claimant_id           uuid not null references auth.users (id) on delete cascade,
    verification_details  text not null,
    status                text not null default 'PENDING' check (status in (
                              'PENDING', 'APPROVED', 'REJECTED'
                          )),
    created_at            timestamptz not null default now(),
    reviewed_at           timestamptz
);

create index if not exists claims_item_id_idx on public.claims (item_id);
create index if not exists claims_claimant_id_idx on public.claims (claimant_id);

alter table public.claims enable row level security;

create policy "Claimants can view their own claims"
    on public.claims for select
    using (auth.uid() = claimant_id);

create policy "Item owners can view claims on their items"
    on public.claims for select
    using (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()));

create policy "Authenticated users can submit a claim"
    on public.claims for insert
    with check (auth.uid() = claimant_id);


-- -----------------------------------------------------------------------------
-- 6. STORAGE BUCKET for item images
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "Anyone can view item images"
    on storage.objects for select
    using (bucket_id = 'item-images');

create policy "Authenticated users can upload item images"
    on storage.objects for insert
    with check (bucket_id = 'item-images' and auth.role() = 'authenticated');

create policy "Users can update their own uploaded images"
    on storage.objects for update
    using (bucket_id = 'item-images' and owner = auth.uid());

create policy "Users can delete their own uploaded images"
    on storage.objects for delete
    using (bucket_id = 'item-images' and owner = auth.uid());

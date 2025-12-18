-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
-- Linked to auth.users
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- PRODUCTS TABLE
create table products (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references profiles(id) not null,
  title text not null,
  description text,
  price numeric not null,
  images text[], -- Array of image URLs
  category text,
  location text, -- "New York, NY"
  is_negotiable boolean default false,
  status text default 'active', -- 'active', 'sold', 'archived'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for products
alter table products enable row level security;

create policy "Products are viewable by everyone."
  on products for select
  using ( true );

create policy "Users can insert their own products."
  on products for insert
  with check ( auth.uid() = seller_id );

create policy "Users can update their own products."
  on products for update
  using ( auth.uid() = seller_id );

-- NEGOTIATIONS TABLE
-- Tracks price pitches
create table negotiations (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) not null,
  buyer_id uuid references profiles(id) not null,
  seller_id uuid references profiles(id) not null,
  pitch_price numeric not null,
  status text default 'pending', -- 'pending', 'accepted', 'rejected'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for negotiations
alter table negotiations enable row level security;

create policy "Users can see negotiations they are involved in."
  on negotiations for select
  using ( auth.uid() = buyer_id or auth.uid() = seller_id );

create policy "Buyers can create negotiations."
  on negotiations for insert
  with check ( auth.uid() = buyer_id );

create policy "Sellers can update status of negotiations."
  on negotiations for update
  using ( auth.uid() = seller_id );

-- MESSAGES TABLE
-- For chat functionality linked to a negotiation/product interest
create table messages (
  id uuid default uuid_generate_v4() primary key,
  negotiation_id uuid references negotiations(id) on delete cascade,
  sender_id uuid references profiles(id) not null,
  receiver_id uuid references profiles(id) not null,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for messages
alter table messages enable row level security;

create policy "Users can see their own messages."
  on messages for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );

create policy "Users can insert messages."
  on messages for insert
  with check ( auth.uid() = sender_id );

-- STORAGE BUCKET SETUP (Instructional - run in UI or separate SQL if enabled)
-- insert into storage.buckets (id, name) values ('product-images', 'product-images');
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'product-images' );
-- create policy "Authenticated Upload" on storage.objects for insert with check ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

-- TRIGGER: Create profile on signup
-- This function automatically creates a profile entry when a new user signs up via Auth
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

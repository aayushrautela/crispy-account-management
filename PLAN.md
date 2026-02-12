# Crispy Account Management - Project Plan

## Overview
A standalone, responsive web application for managing "Crispy" user accounts. This portal decouples account creation and management from the main content consumption clients (WebUI, Native Apps).

## Technical Stack
- **Framework:** React 19 + Vite 7 (TypeScript)
- **Styling:** Tailwind CSS 4 (Mobile-first, Clean/Minimalist, Dark/Light mode support)
- **Backend:** Supabase (Auth & Database)
- **State Management:** Zustand (Auth session, User profile state)
- **Icons:** Lucide React
- **Routing:** React Router DOM

## Architecture & Features

### 1. Authentication (Public Routes)
- **Sign Up:** Exclusive entry point for new account creation.
- **Sign In:** Standard Email/Password login.
- **Forgot Password:** Supabase password reset flow.

### 2. User Dashboard (Protected Routes)
- **Profile Management:**
    - **List Profiles:** View all profiles associated with the account.
    - **Create Profile:** Add a new profile (Name, Avatar).
    - **Edit Profile:** Rename, Change Avatar (upload to `avatars` bucket).
    - **Delete Profile:** Remove a profile.
- **Account Settings:**
    - **Security:** Update Email, Change Password.
    - **Danger Zone:** Delete Account (Cascading delete of all data).
- **Downloads Section:**
    - Clean cards/buttons for downloading clients:
        - Windows
        - Linux
        - Android
        - (Expandable for future platforms)

### 3. Visual Design
- **Assets:** Uses existing `logo.svg` from `Crispy-webui`.
- **Theme:** Solid backgrounds (no gradients), high contrast, professional aesthetics.
- **Layout:**
    - *Mobile:* Bottom navigation or Hamburger menu.
    - *Desktop:* Sidebar navigation or Top-bar with centered content.

## Database Integration (Supabase)
- **Tables:**
    - `auth.users`: Managed by Supabase.
    - `public.profiles`: CRUD operations for user profiles.
    - `public.account_data`: Read-only.
- **Storage:**
    - `avatars` bucket: Profile image uploads.

## Implementation Status
- [x] Project Scaffolding (Vite + React + TS)
- [x] Tailwind CSS 4 Configuration
- [x] Supabase Client Setup
- [x] Auth Store (Zustand)
- [x] Auth Pages (Login/Signup)
- [x] Dashboard Layout (Sidebar/Mobile Nav)
- [x] Profile Management (List, Add, Edit, Delete)
- [x] Account Settings (Email, Password, Delete Account)
- [x] Downloads Page

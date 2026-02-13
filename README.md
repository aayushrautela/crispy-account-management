# Crispy Account Management

A standalone, production-grade React application for managing Crispy accounts. This portal decouples authentication and user management from the main content consumption clients.

## Features

- **Authentication**: Secure sign-up, sign-in, and password recovery powered by Supabase Auth.
- **Profile Management**:
  - Create, Edit, and Delete profiles.
  - Upload profile avatars (stored in Supabase Storage).
  - Manage multiple profiles under a single account.
- **Account Security**:
  - Update Email and Password.
  - "Danger Zone" for account deletion.
- **Get the app**: Access client downloads for Windows, Linux, and Android.
- **Modern UI**: Clean, minimalist dark-mode interface built with Tailwind CSS and Lucide icons.

## Tech Stack

- **Framework**: React 19 + Vite 7 (TypeScript)
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Storage)
- **Routing**: React Router DOM

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/crispy-account-management.git
    cd crispy-account-management
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment Variables:
    Create a `.env` file in the root directory with your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

### Running the Application

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

- `src/layouts`: Auth and Dashboard layouts.
- `src/pages`:
  - `auth/`: Login, Signup pages.
  - `dashboard/`: Profile List, Account Settings, Get the app
- `src/components`: Reusable UI components (Button, Input, Modal, ProfileForm).
- `src/store`: Zustand stores (useAuthStore).
- `src/lib`: Supabase client and utility functions.
- `src/types`: TypeScript interfaces.

## Deployment

This project is ready for deployment on Vercel, Netlify, or any static site host. Ensure you add the environment variables in your deployment settings.

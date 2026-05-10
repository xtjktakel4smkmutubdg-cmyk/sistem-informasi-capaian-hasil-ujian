# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Database Setup

To automatically configure the database and spawn the default administrator account without requiring dashboard access:
Execute the `supabase_setup.sql` script located in the root via your Supabase Dashboard SQL Editor.

## Admin Login

To login as an administrator, use the following credentials (after running the SQL script):
- **Email/NIS:** `admin@portal.com`
- **Password:** `adminpassword123`

# Alpharive Voice Bot

Full-stack MVP for a company AI voice chatbot.

## Stack
- Frontend: React + Vite + Tailwind
- Backend: FastAPI
- AI: OpenAI Realtime API with WebRTC
- DB: Supabase
- Deploy: Vercel + Render

## Quick start

### Backend
```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Supabase table
```sql
create table voice_sessions (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,
  transcript jsonb,
  outcome text default 'inquiry',
  created_at timestamptz default now()
);
```

## Deploy
- Frontend -> Vercel
- Backend -> Render
- Set `FRONTEND_URL` in backend env to your deployed frontend URL
- Set `VITE_BACKEND_URL` in frontend env to your deployed backend URL

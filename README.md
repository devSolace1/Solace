# Solace

A free and anonymous emotional support platform.

Solace is a safe place where people can talk, breathe, and heal without fear of judgment, identity exposure, or financial barriers.

Our mission is simple:

Everyone deserves someone who listens.

---

## 🌍 Vision

Mental health support should not be a luxury.

Solace aims to create a global platform where anyone can receive emotional support anonymously, safely, and freely.

The platform initially focuses on helping people experiencing:

- heartbreak
- loneliness
- emotional distress
- relationship problems

But in the long term, Solace aims to support a wide range of mental health challenges.

---

## ✨ Core Principles

Solace is built on four main principles.

### 1. Free Access

Most emotional support platforms are expensive.

Solace will always prioritize **free access** so that people who cannot afford therapy can still talk to someone.

---

### 2. Anonymous by Design

Solace does not require:

- real names
- phone numbers
- personal identity
- social media accounts

Users can speak freely without fear of being judged or exposed.

---

### 3. Safe Environment

The platform includes multiple systems to prevent misuse such as:

- anti-dating policy
- conversation monitoring tools for counselors
- abuse reporting
- safety guidelines

The goal is to protect both users and counselors.

---

### 4. Academic Collaboration

Solace aims to collaborate with:

- universities
- psychology departments
- mental health communities

Counselors can be trained psychology students or volunteers supervised by professionals.

Anonymous behavioral data may be used for academic research while strictly preserving user privacy.

---

## 🧠 Key Features

### Anonymous Login

Users can enter the platform instantly without email or registration.

Accounts are generated using anonymous tokens.

---

### Random Counselor Matching

Users can start conversations with randomly assigned counselors.

If they feel comfortable, they can request the counselor as a **preferred counselor**.

---

### Daily Emotional Check-In

Users answer a short daily quiz to help track their emotional condition.

This helps counselors understand patterns such as:

- stress
- sadness
- emotional triggers

---

### Emotional Journal

Users can write private emotional notes to track their healing journey.

---

### Panic Button

A prominent **panic button** is available if a user suddenly experiences intense emotional distress.

---

## 🚀 Getting Started (Local Development)

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env.local` file with the following values (example):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Security:** Never commit `.env.local` to source control. The service role key provides full access to your Supabase project.

### 3) Prepare the database schema

Run the SQL script in `db/schema.sql` against your Supabase database, or use Supabase migrations.

### 4) Run the development server

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

---

## 📦 Deployment

This project is designed to deploy on **Vercel**.

1. Create a new project on Vercel and connect this repository.
2. Set the same environment variables in Vercel.
3. Deploy.

---

## 🧩 Project Structure (Overview)

- `/app` - Next.js App Router pages and API routes.
- `/components` - UI components separated by domain.
- `/lib` - Client/server helpers, Supabase clients, session management.
- `/db` - Database schema & migration scripts.

---

## 🔐 Security & Privacy Notes

- No personal identifiers are requested.
- Sessions are stored locally and tied to an anonymous user ID.
- Recovery keys allow restoring sessions without exposing identity.
- Messages and journals are stored in Postgres and can be encrypted in the future.

---

## 🎓 Research & Insights

The platform stores anonymized behavioral data (mood trends, match history, session patterns) for potential academic research, while keeping individual identities hidden.


Pressing the button will prioritize the user and connect them to an available counselor immediately.

---

### Counselor Insights

Counselors can view anonymous behavioral patterns to better support users.

Examples:

- mood trends
- emotional triggers
- session frequency

No personal identity information is collected.

---

## 🔒 Privacy & Safety

Privacy is a core value.

Solace does not collect:

- real identities
- phone numbers
- personal addresses
- government IDs

All conversations remain private and encrypted.

---

## 🛠 Technology Stack

The platform is designed to be lightweight, scalable, and accessible.

Proposed stack:

Frontend
- Next.js
- TypeScript
- TailwindCSS

Backend
- Supabase
- PostgreSQL

Infrastructure
- Vercel
- Edge Functions

Real-time Communication
- WebSocket / Realtime API

---

## 🚀 Project Goals

Short term goals:

- Build MVP anonymous counseling platform
- Implement secure anonymous sessions
- Enable real-time chat
- Launch emotional tracking tools

Long term goals:

- Collaborate with universities
- Expand counselor network
- Support multiple languages
- Scale globally

---

## 🤝 Contributing

This project welcomes contributors who care about mental health accessibility.

We are especially looking for:

- developers
- UI/UX designers
- psychologists
- researchers
- volunteers

If you want to help build a safer emotional support platform, feel free to contribute.

---

## 📜 Ethical Commitment

Solace is not a replacement for professional therapy or emergency services.

If a user is in immediate danger or crisis, they should contact local emergency services or professional mental health support.

Solace aims to provide **supportive listening and emotional guidance**, not clinical treatment.

---

## ❤️ Why This Project Exists

Many people suffer in silence.

Sometimes they don't need a diagnosis.

They just need someone who listens.

Solace exists to make sure that no one has to face their emotions alone.

---

## 🚀 Deployment

### Prerequisites

- Node.js 18+
- Supabase account
- Vercel account (recommended)

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Database Setup

1. Create a new Supabase project
2. Run the schema from `db/schema.sql` in the SQL editor
3. Update your environment variables

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

### Local Development

```bash
npm install
npm run dev
```

### Admin Setup

To create admin/moderator accounts:

1. Insert into users table with role='moderator'
2. They can log in via `/counselor` with their user ID (for now, or add admin login later)

Counselors log in via `/counselor` with their counselor_code.

---

## License

Open source (MIT License)

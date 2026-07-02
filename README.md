# Pixo
**Access your files, fluently.**

## Architecture Overview

```
pixo/
├── backend/          # Node.js + Express API server
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── db/
│   ├── .env.example
│   └── package.json
├── database/
│   ├── schema.sql       # Full PostgreSQL schema
│   └── seed.sql         # Initial seed (hashed access code)
└── README.md
```

## Quick Start

1. `cd backend && npm install`
2. Copy `.env.example` to `.env` and fill in values
3. Run `database/schema.sql` then `database/seed.sql` on your Postgres instance
4. `npm run dev`

# CRI — Vercel Deployment Guide & Readiness Audit

**Deployment Status**: Vercel-ready; deployment not yet verified.  
**Frontend Framework**: Next.js 14 (App Router) + TypeScript + Tailwind CSS.  
**Target Platform**: Vercel.

---

## 1. Vercel Project Root & Configuration Options

You can deploy the CRI Next.js frontend using either of the two standard Vercel configuration approaches:

### Recommended Option: Subdirectory Project Root (`frontend`)
- **Root Directory in Vercel Settings**: `frontend`
- **Framework Preset**: `Next.js` (automatically detected)
- **Build Command**: `next build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### Alternative Option: Monorepo / Repository Root
If leaving the Vercel Root Directory as the repository root (`.`):
- **Framework Preset**: `Next.js`
- **Build Command**: `npm --prefix frontend run build` (or `npm run build` via root `package.json`)
- **Output Directory**: `frontend/.next` (configured in [`vercel.json`](../vercel.json))
- **Install Command**: `npm --prefix frontend install`

---

## 2. Environment Variables

Configure the following environment variables in the Vercel Dashboard (**Project Settings → Environment Variables**):

| Variable Name | Required | Target Environments | Example Value | Description |
| :--- | :---: | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | **Yes** | Production, Preview, Development | `https://api.yourdomain.com` | Full HTTPS base URL of your FastAPI backend. |

> [!IMPORTANT]
> **Zero Secret Exposure**:
> Do **NOT** set `COHERE_API_KEY`, `QDRANT_API_KEY`, or any server-side credentials as `NEXT_PUBLIC_*` variables. The frontend client only speaks to your authenticated or isolated FastAPI backend. All Cohere and Qdrant credentials remain exclusively on the backend server.

---

## 3. Backend CORS Requirement

Your deployed FastAPI backend must authorize requests originating from your Vercel deployment domain.

Configure the `CORS_ORIGINS` environment variable on your FastAPI backend server:

```bash
# Example for production backend .env
CORS_ORIGINS=https://cri-workspace.vercel.app,https://your-custom-domain.com,http://localhost:3000
```

The backend parses `CORS_ORIGINS` into allowed origins in [`app/main.py`](../app/main.py):
```python
cors_setting = settings.CORS_ORIGINS.strip()
cors_origins = ['*'] if cors_setting == '*' else [o.strip() for o in cors_setting.split(',') if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
```

---

## 4. Step-by-Step Vercel Deployment

1. **Push Repository to GitHub / GitLab / Bitbucket**:
   Ensure the latest commits including `frontend/` and `package.json` are pushed.

2. **Import Project into Vercel**:
   - Navigate to [vercel.com/new](https://vercel.com/new).
   - Select your repository.

3. **Configure Project Settings**:
   - **Project Name**: `cohere-research-intelligence` (or preferred name).
   - **Framework Preset**: Select `Next.js`.
   - **Root Directory**: Click *Edit* and select `frontend`.
   - **Environment Variables**: Add `NEXT_PUBLIC_API_BASE_URL` pointing to your deployed backend.

4. **Deploy**:
   - Click **Deploy**.
   - Vercel will install dependencies via `npm install` and execute `next build`.

---

## 5. Post-Deployment Verification Checklist

Once deployed on Vercel, verify the production installation against your backend:

- [ ] **Load Application**: Verify the 3-column research workspace loads without layout shifts or console errors.
- [ ] **Document Library**: Verify `BERT.pdf` appears under Sources with its 16 pages and indexed status.
- [ ] **Query Execution**: Submit `"What is Masked Language Modeling in BERT?"` and verify answer synthesis.
- [ ] **Citation Provenance**: Click citation `[1]` and confirm smooth auto-scroll to the passage card in the Evidence panel.
- [ ] **Verification Audit**: Verify `Evidence gate: PASS`, `Grounding: GROUNDED/PASS`, and document scope.
- [ ] **Safe Abstention**: Submit out-of-scope query `"What is the population of Mars?"` and verify the `"Insufficient evidence"` refusal with 0 hallucinated data.
- [ ] **Document Scope Clearing**: Click `Clear scope` and submit a query; verify retrieval and generation are blocked (`grounding_status: BLOCKED`).
- [ ] **Developer Trace Drawer**: Click `Trace` in the header and verify 9-stage latencies and token accounting.

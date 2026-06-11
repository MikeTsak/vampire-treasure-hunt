# Hunt Tracker

A tool for managing and participating in hunting chronicles within the Vampire Platform LARP. Players can accept hunts, complete varied challenges (text, GPS, QR, drawing, photo, audio), and track their progress. Storytellers can create and manage hunts, steps, and review submissions.

## Features

### For Players
- View available hunting chronicles.
- Participate in diverse challenge types:
  - **Text**: Answer riddles or provide passwords.
  - **GPS**: Navigate to specific real-world coordinates.
  - **QR Code**: Scan QR codes placed in the environment.
  - **Drawing**: Draw symbols or sigils on a canvas.
  - **Photo**: Take or upload photos as evidence.
  - **Audio**: Record or upload audio recordings (incantations, speeches, etc.).
- Join or form coteries (teams) to tackle hunts together.
- Track progress through each hunt's steps.
- Receive notifications when hunts are active or steps become available.

### For Storytellers (Admin)
- Create new hunting chronicles with titles and descriptions.
- Add steps of various types (text, gps, qr, photo, draw, audio) with custom prompts and solutions.
- Reorder, edit, or delete steps.
- Toggle hunts active/inactive.
- Monitor player progress in real-time.
- Review and approve/reject player submissions (especially for manual review tasks like photo, drawing, audio).
- Force-advance players if needed.
- Delete hunts entirely.

## Getting Started

### Prerequisites
- Node.js 18+ (npm 9+ recommended)
- A running Vampire Platform backend (the hunt tracker expects specific API endpoints under `/api/hunts*` and `/api/admin/hunts*`).

### Installation
1. Clone the repository and navigate to the hunt directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the app:
   - Create a `.env` file in the root (see frontend for example; the hunt app likely uses Vite environment variables).
   - Set `VITE_API_URL` to point to your Vampire Platform backend (e.g., `http://localhost:3001/api`).
4. Start the development server:
   ```bash
   npm run dev
   ```
5. The app will be available at `http://localhost:5173` (or another port).

## Technology Stack
- React
- Vite
- React Router DOM
- Axios (via `src/api.js`)
- @yudiel/react-qr-scanner for QR code scanning
- HTML5 Canvas for drawing challenges
- Media Recording API for audio challenges
- Geolocation API for GPS challenges

## API Endpoints Expectations
The hunt tracker expects the following endpoints relative to the backend API base:

- `GET /hunts/active` – List active hunts for the player.
- `POST /hunts/submit` – Submit an answer for a hunt step.
- `GET /characters/me` – Get current character info (for name).
- `GET /admin/hunts` – (Admin) List all hunts.
- `POST /admin/hunts` – (Admin) Create a new hunt.
- `PATCH /admin/hunts/:id/toggle` – (Admin) Toggle hunt active status.
- `DELETE /admin/hunts/:id` – (Admin) Delete a hunt.
- `GET /admin/hunts/:id/steps` – (Admin) Get steps for a hunt.
- `POST /admin/hunts/:id/steps` – (Admin) Add a step.
- `PUT /admin/hunts/:id/steps/:stepId` – (Admin) Edit a step.
- `DELETE /admin/hunts/:id/steps/:stepId` – (Admin) Delete a step.
- `PATCH /admin/hunts/:id/steps/:stepId/move/:direction` – (Admin) Move a step up/down.
- `GET /admin/hunts/:id/progress` – (Admin) Get player progress.
- `GET /admin/hunts/:id/reviews` – (Admin) Get pending submissions for review.
- `POST /admin/reviews/:submissionId/approve` – (Admin) Approve a submission.
- `POST /admin/reviews/:submissionId/reject` – (Admin) Reject a submission.
- `POST /admin/hunts/:id/progress/:userId/advance` – (Admin) Force-advance a player.

## Project Structure
- `src/` – Source code
  - `api.js` – Axios instance configured with auth token.
  - `App.jsx` – Main application router.
  - `pages/` – Login, ActiveHunt (player), HuntAdmin (storyteller).
  - `components/` – Reusable components (Footer, etc.).
  - `styles/` – CSS modules for each page.
  - `assets/` – Images, icons, etc.

## Notes
This app is part of the Vampire Platform ecosystem. It requires a backend that implements the expected API endpoints. Ensure your backend is running and accessible from the hunt tracker (adjust CORS settings if necessary).

The hunt tracker uses a token stored in `localStorage` under the key `token` for authentication, obtained via the backend's `/auth/login` endpoint.

## License
Please check the LICENSE file in the repository for licensing information.
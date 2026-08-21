<div align="center">
  <img src="https://raw.githubusercontent.com/nextjs/vercel-nextjs-assets/main/images/nextjs-icon-dark-background.png" alt="Next.js" width="80" height="80" />
  <h1>📅 Mini Appointment App</h1>
  <p>A full-stack mini appointment management application built as part of the <strong>ooca</strong> take-home assessment.</p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  </p>
</div>

<br />

> **Note:** We recommend running this on a clean clone to test the application seamlessly. No global dependencies (like Docker or external Databases) are required other than `Node.js`.

---

## 🚀 1. Setup and Run Instructions

### Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (comes with Node.js)

### Running the Application

<details open>
<summary><b>Step 1: Start the Backend (API)</b></summary>

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
   > 🟢 The API will run on `http://localhost:3001` (Database `database.sqlite` will be auto-generated).
</details>

<details open>
<summary><b>Step 2: Start the Frontend (Next.js)</b></summary>

1. Open a **new terminal tab** and navigate to the project root directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   > 🔵 The Web App will run on `http://localhost:3000`
</details>

---

## 📡 2. API Endpoints

Our RESTful API strictly follows the assignment requirements and standard HTTP status codes (`201`, `400`, `404`, `409`, `500`).

| Method | Endpoint | Description |
| :---: | :--- | :--- |
| <kbd>POST</kbd> | `/appointments` | **Create an appointment**.<br/>_Validates required fields, future dates, and returns `409 Conflict` on a 30-min overlap._ |
| <kbd>GET</kbd> | `/appointments` | **List all appointments**.<br/>_Supports filtering via query parameter (e.g., `?status=pending`)._ |
| <kbd>PATCH</kbd> | `/appointments/:id` | **Update appointment status**.<br/>_Allowed values: `pending`, `confirmed`, `cancelled`._ |
| <kbd>DELETE</kbd> | `/appointments/:id` | **Delete an appointment** record completely from the database. |

---

## 🛠 3. Tech Stack Choices and Reasons

### Frontend: **Next.js (App Router) + React + Tailwind CSS**
- **Next.js App Router:** Provides modern React patterns, fast development, and built-in optimized routing.
- **Tailwind CSS:** Allows creating a clean, responsive, and highly polished modern UI quickly without context-switching to CSS files.

### Backend: **Node.js + Express**
- **Express.js:** Lightweight, robust, and incredibly easy to set up for RESTful APIs. Offers full control over middleware (CORS, JSON parsing, error handling).

### Database: **SQLite (via `sqlite3` package)**
- **SQLite:** Requires **zero server setup** for the reviewer. The database file (`database.sqlite`) is automatically initialized upon running the server. Highly portable and perfectly suited for this scale.

---

## ✨ 4. UI & UX Features

Instead of relying on clunky native browser inputs, this app delivers a polished user experience:

- 🎨 **Modern Toast Notifications:** Clean pop-up feedback for successful actions (booking created, confirmed) and API errors (e.g. `409 Conflict` on overlapping slots).
- 📅 **Custom Inline Calendar:** A fully custom calendar widget with a 'Today' quick-jump button.
- 🕒 **Digital Time Wheel Picker:** An iOS-style scrollable custom time picker replacing native `<select>` dropdowns.
- 🔒 **Smart Slot Validation:** Real-time visual disabling of time slots that are either in the past or already booked by someone else.
- 🗑 **Safe Deletion:** Modal confirmation dialogs before deleting any appointment records.
- 📊 **Real-time Status Filters:** Filter tabs (`All`, `Pending`, `Confirmed`, `Cancelled`) with live counts.

---

## 🔮 5. What I did not finish / What I would do next

If I had more time, I would focus on scaling and adding professional-grade features:

1. **Pagination & Search:** The `/appointments` GET route currently fetches all records. In a production environment with large datasets, I would implement cursor or offset pagination (`?page=1&limit=10`) and a search bar by patient name.
2. **Authentication & Role-based Access:** Add doctor/staff authentication (JWT or NextAuth) to control permissions for confirming or cancelling appointments.
3. **Calendar View:** Add a full monthly/weekly visual calendar grid (e.g. FullCalendar) to view booked slots interactively in a dashboard.
4. **Unit & Integration Tests:** Add Jest or Playwright test suites to automate API overlap testing and UI rendering.

---

## 🤖 6. AI Tool Usage

I utilized an AI coding assistant (LLM) during this assessment. **Using it is fine and costs me nothing, but I am fully capable of explaining every line of code submitted.**

**Specifically, I used it to:**
- Scaffold the initial Express and Next.js boilerplates to save setup time.
- Generate the core overlap validation logic (`Math.abs(t1 - t2) < 30 mins`).
- Design modern Tailwind UI components rapidly, such as the Toast notification system, custom calendar, and the scrollable time wheel picker.

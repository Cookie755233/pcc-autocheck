# TenderWatch

TenderWatch is a web application that helps users track and monitor government procurement tenders based on their interests. The app automatically fetches and displays government procurement data based on user-defined keywords, with results organized in a Kanban-style board layout.

## Features

- **Keyword-based Subscription**: Subscribe to tenders by adding keywords of interest
- **Automatic Tender Fetching**: Automatically checks for new tenders from the government procurement API
- **Kanban Board View**: Organize tenders in an intuitive board layout
- **Advanced Filtering**: Filter tenders by organization, date range, and more
- **Visual Keyword Filtering**: Toggle visibility of tenders with specific keywords
- **User Authentication**: Secure login with Google accounts via Clerk

## Tech Stack

- **Frontend**: Next.js 14 with App Router, React, TypeScript
- **UI Components**: Shadcn UI, Radix UI, Tailwind CSS
- **Authentication**: Clerk
- **Database**: Prisma ORM
- **API**: Integration with Taiwan government procurement API

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- A Clerk account for authentication
- A database (PostgreSQL recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tenderwatch.git
   cd tenderwatch
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file with the following variables:
   ```
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/tenderwatch"
   
   # API
   NEXT_PUBLIC_API_URL="https://pcc.g0v.ronny.tw/api"
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure 
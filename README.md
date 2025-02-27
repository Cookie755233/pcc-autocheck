# TenderWatch

TenderWatch is a web application that helps users track and monitor government procurement tenders based on their interests. The app automatically fetches and displays government procurement data based on user-defined keywords, with results organized in a Kanban-style board layout.

## Features

- **Keyword-based Subscription**: Subscribe to tenders by adding keywords of interest
- **Automatic Tender Fetching**: Automatically checks for new tenders from the government procurement API
- **Kanban Board View**: Organize tenders in an intuitive board layout
- **Advanced Filtering System**:
  - Filter by organization/bureau
  - Filter by tender type
  - Date range filtering
  - Global search for tender titles
  - Clear filters with one click
- **Tender Management**:
  - Archive/unarchive tenders
  - Highlight important tenders
  - View tender details and history
- **Export Capabilities**:
  - Export to JSON for data analysis
  - Export to formatted text for sharing
  - Export to PDF with customizable quality settings
  - Progress tracking for large exports
- **User Authentication**: Secure login with Google accounts via Clerk

## Tech Stack

- **Frontend**: Next.js 14 with App Router, React, TypeScript
- **UI Components**: Shadcn UI, Radix UI, Tailwind CSS
- **Authentication**: Clerk
- **Database**: Prisma ORM
- **API**: Integration with Taiwan government procurement API
- **PDF Generation**: jsPDF, html2canvas
- **State Management**: React hooks, Context API
- **Date Handling**: date-fns with locale support

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

```
tenderwatch/
├── app/                  # Next.js App Router
│   ├── api/              # API routes
│   │   └── tenders/      # Tender-related API endpoints
│   ├── dashboard/        # Dashboard page
│   └── ...
├── components/           # React components
│   ├── dashboard/        # Dashboard-specific components
│   │   ├── tender-board.tsx    # Main tender display board
│   │   ├── tender-card.tsx     # Individual tender card
│   │   ├── tender-filters.tsx  # Filtering interface
│   │   └── export-button.tsx   # Export functionality
│   ├── ui/               # Shadcn UI components
│   └── ...
├── lib/                  # Utility functions and shared code
│   ├── date-utils.ts     # Date formatting utilities
│   └── events/           # Event handling
├── prisma/               # Prisma schema and migrations
├── public/               # Static assets
└── types/                # TypeScript type definitions
    └── tender.ts         # Tender-related type definitions
```

## Usage

1. **Login**: Sign in with your Google account
2. **Add Keywords**: Enter keywords related to tenders you're interested in
3. **Fetch Tenders**: Click "Fetch New Tenders" to search for matching tenders
4. **Filter Results**: 
   - Use the filter panel to narrow down by organization or type
   - Use the search box to find tenders by title
   - Filter by date range using the slider
5. **Organize Tenders**: 
   - Archive tenders you're not interested in
   - Highlight important tenders
   - View tender details by clicking on a card
6. **Export Data**:
   - Export filtered tenders to JSON, text, or PDF
   - Share tender information with colleagues

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [g0v Taiwan](https://g0v.tw/) for providing the procurement data API
- [Shadcn UI](https://ui.shadcn.com/) for the component library
- [Clerk](https://clerk.dev/) for authentication

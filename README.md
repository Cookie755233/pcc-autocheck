# TenderWatch

TenderWatch is a web application that helps users track and monitor government procurement tenders based on their interests. The app automatically fetches and displays government procurement data based on user-defined keywords, with results organized in a Kanban-style board layout.

## Features

- **Keyword-based Subscription**: Subscribe to tenders by adding keywords of interest
- **Automatic Tender Fetching**: Automatically checks for new tenders from the government procurement API
- **Kanban Board View**: Organize tenders in an intuitive board layout
- **Timeline Visualization**:
  - Interactive chronological view of all tenders by keyword
  - Horizontally scrollable timeline with sticky headers
  - Color-coded tender types for easy identification
  - Zoom and filter controls for exploring tender data
  - Detailed hover cards with tender information
  - Monthly/yearly view options for different time scales
  - Support for highlighting important tenders
- **Real-time Processing Logs**: 
  - Detailed color-coded logs showing search progress
  - Visual indicators for new, updated, and existing tenders
  - Collapsible log interface for clean UX
- **Smart Notifications**: 
  - Only notify for new tenders or tenders with new versions
  - Clear visual indicators for unread items
  - Batch actions for managing notifications
- **Advanced Filtering System**:
  - Filter by organization/bureau
  - Filter by tender type
  - Date range filtering
  - Global search for tender titles
  - Keyword focus/hide options
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
- **Full Dark Mode Support**: Complete dark mode styling across all components

## Tech Stack

- **Frontend**: Next.js 14 with App Router, React, TypeScript
- **UI Components**: Shadcn UI, Radix UI, Tailwind CSS
- **Authentication**: Clerk
- **Database**: Prisma ORM
- **API**: Integration with Taiwan government procurement API
- **Date Handling**: date-fns with ROC calendar support
- **PDF Generation**: jsPDF, html2canvas
- **State Management**: React hooks, Context API
- **Toast Notifications**: Custom-styled contextual toast system with variants (success, error, warning, info)

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
│   │   └── statistics/   # Timeline visualization
│   └── ...
├── components/           # React components
│   ├── dashboard/        # Dashboard-specific components
│   │   ├── tender-board.tsx    # Main tender display board
│   │   ├── tender-card.tsx     # Individual tender card
│   │   ├── tender-filters.tsx  # Filtering interface
│   │   └── export-button.tsx   # Export functionality
│   ├── ui/               # Shadcn UI components
│   └── ...
├── contexts/             # Context providers
│   └── notification-context.tsx # Notification management
├── lib/                  # Utility functions and shared code
│   ├── date-utils.ts     # Date formatting utilities
│   └── events/           # Event handling
├── prisma/               # Prisma schema and migrations
├── public/               # Static assets
└── types/                # TypeScript type definitions
    └── tender.ts         # Tender-related type definitions
```

## User Interface Features

### Timeline Visualization
- **Chronological view**: Visualize all tenders in a timeline format organized by keywords
- **Interactive controls**: Zoom in/out, switch between monthly and yearly views
- **Filtering capabilities**: Focus on specific tender types or highlight important tenders
- **Responsive design**: Works on different screen sizes with horizontal scrolling
- **Detailed hover cards**: Quick access to tender information without opening full details
- **Date parsing**: Supports various date formats including ROC dates (民國)

### Enhanced Logging System
- **Color-coded logs**: Green for new items, blue for updates, amber for warnings, red for errors
- **Detailed process information**: See which keywords are being processed
- **Real-time updates**: Follow the search progress as it happens
- **Collapsible detail view**: Keep the UI clean with expandable logs

### Smart Notifications
- **Intelligent triggering**: Only notifies when there's truly new content
- **Status tracking**: Clearly indicates which tenders are new or updated
- **Batch management**: Mark all as read with a single click

### Contextual Toast Notifications
- **Variant styling**: Different styles for success, error, warning, and info messages
- **Dark mode support**: Proper contrast in both light and dark themes
- **Clear messaging**: Descriptive titles and details for user feedback

### Dark Mode Support
- **Complete theme integration**: All components styled for both light and dark modes
- **Proper contrast**: Carefully selected colors for readability in all lighting conditions
- **Consistent design language**: Maintains visual harmony across the entire application

## Usage

1. **Login**: Sign in with your Google account
2. **Add Keywords**: Enter keywords related to tenders you're interested in
3. **Fetch Tenders**: Click "Fetch New Tenders" to search for matching tenders
4. **Monitor Progress**: 
   - Watch the progress bar and detailed logs during search
   - See color-coded results as they come in
5. **Visualize Timeline**:
   - Navigate to the Statistics page to see your tenders on a timeline
   - Use zoom controls to adjust the time scale
   - Filter by tender type or highlight important tenders
   - Hover over tender bars to see details or click to open full information
6. **Filter Results**: 
   - Use the filter panel to narrow down by organization or type
   - Use the search box to find tenders by title
   - Filter by date range using the slider
   - Focus on or hide specific keywords
7. **Organize Tenders**: 
   - Archive tenders you're not interested in
   - Highlight important tenders
   - View tender details by clicking on a card
8. **Export Data**:
   - Export filtered tenders to JSON, text, or PDF
   - Share tender information with colleagues

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [政府採購網 API by Ronny Wang](https://pcc.g0v.ronny.tw/) - The core API powering this project's tender data
  - API Endpoint: https://pcc.g0v.ronny.tw/api/
  - Source Code: [Backend API](https://github.com/ronnywang/pcc.g0v.ronny.tw) | [Frontend Viewer](https://github.com/ronnywang/pcc-viewer)
  - Data sourced from [政府電子採購網](https://web.pcc.gov.tw/)


- [Shadcn UI](https://ui.shadcn.com/) for the component library
- [Clerk](https://clerk.dev/) for authentication

## Usage Rights:
1. Content published under PCC's name can be reproduced, broadcast, or transmitted within reasonable scope with proper attribution
2. Information can be reproduced for personal or non-profit family use
3. Citations allowed for reporting, commentary, teaching, research, or other legitimate purposes within reasonable scope with proper attribution
4. Other fair use cases as per Copyright Act Articles 44-65
5. Commercial use requires accessing official open data sets from the Government e-Procurement System
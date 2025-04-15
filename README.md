# GymMatchMate

Find your perfect gym and workout partners with GymMatchMate - a modern matching app for fitness enthusiasts.

## 📱 App Preview

![GymMatchMate Home](client/assets/previews/Screenshot%202025-04-15%20at%203.25.56%20PM.png)
![GymMatchMate Matching](client/assets/previews/Screenshot%202025-04-15%20at%203.27.22%20PM.png)
![GymMatchMate Profile](client/assets/previews/Screenshot%202025-04-15%20at%203.28.04%20PM.png)
![GymMatchMate Settings](client/assets/previews/Screenshot%202025-04-15%20at%203.28.33%20PM.png)

## 🌟 Features

- **Smart Gym Matching**: Find gyms that match your preferences, location, and fitness goals
- **User Profiles**: Create detailed profiles with body measurements and fitness goals
- **Real-time Chat**: Connect with potential gym partners
- **Gym Management**: Admin panel for managing gym listings and user moderation
- **Interactive UI**: Modern, responsive interface for both mobile and web

## 🛠️ Tech Stack

### Frontend
- React/Next.js
- Shadcn UI components
- Tailwind CSS
- Wouter for routing

### Backend
- Express.js
- Drizzle ORM with PostgreSQL/Neon Database
- Authentication with Passport.js (Google, Facebook, Local)

### Deployment
- Configured for easy deployment on various platforms

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/GymMatchMate.git
cd GymMatchMate
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
Create a `.env` file based on the example provided.

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:5000](http://localhost:5000) in your browser to see the application.

## 📊 Project Structure

```
├── client/               # Frontend code
│   ├── assets/           # Static assets
│   └── src/              # Source code
│       ├── components/   # Reusable UI components
│       ├── lib/          # Utility functions
│       └── main.tsx      # Entry point
├── server/               # Backend API
├── shared/               # Shared types and utilities
└── dist/                 # Production build
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

For any questions or suggestions, please open an issue on this repository. 
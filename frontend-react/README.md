# KIDSCODE - React Version 🚀

A complete React.js conversion of the KIDSCODE coding education platform for kids.

## Features

- ✅ **React Router** - Proper routing with `/curriculum` and `/lesson/:moduleId/:lessonId`
- ✅ **Context API** - Global state management for authentication and user progress
- ✅ **Protected Routes** - Authentication-based route protection
- ✅ **Component-Based** - Modular, reusable React components
- ✅ **Hooks** - Modern React with useState, useEffect, useContext, useRef
- ✅ **API Integration** - Axios for backend communication
- ✅ **Responsive Design** - Mobile-friendly with Tailwind CSS
- ✅ **Code Editor** - Interactive coding environment with turtle graphics
- ✅ **Progress Tracking** - Save and load user progress

## Project Structure

```
frontend-react/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── components/
│   │   └── Navbar.js       # Navigation bar component
│   ├── context/
│   │   └── AuthContext.js  # Authentication context provider
│   ├── pages/
│   │   ├── Auth.js         # Login/Register page
│   │   ├── Dashboard.js    # Home dashboard
│   │   ├── Curriculum.js   # Curriculum listing with clickable lessons
│   │   └── Lesson.js       # Individual lesson page with code editor
│   ├── services/
│   │   └── api.js          # API service layer
│   ├── App.js              # Main app with routing
│   ├── index.js            # React entry point
│   └── index.css           # Global styles
├── package.json            # Dependencies
└── README.md              # This file
```

## Installation & Setup

### 1. Install Dependencies

```bash
cd frontend-react
npm install
```

### 2. Start Development Server

The React app is configured to proxy API requests to `http://localhost:3000` (the backend server).

```bash
npm start
```

This will start the React development server on **http://localhost:3001**

### 3. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

## Backend Integration

The backend server (in `../backend/`) has been updated to serve the React build:

```javascript
// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend-react/build')));

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend-react/build/index.html'));
});
```

## Running the Full Application

### Development Mode

1. **Start Backend** (Terminal 1):
```bash
cd backend
node server.js
```

2. **Start React Dev Server** (Terminal 2):
```bash
cd frontend-react
npm start
```

- Backend API: http://localhost:3000/api
- React App: http://localhost:3001

### Production Mode

1. **Build React App**:
```bash
cd frontend-react
npm run build
```

2. **Start Backend** (serves React build):
```bash
cd backend
node server.js
```

- Full App: http://localhost:3000

## Key Improvements Over Vanilla JS Version

### 1. **Proper Routing**
- **Before**: Hash-based routing (`#curriculum`, `#lesson-1-1`)
- **After**: Clean URLs (`/curriculum`, `/lesson/1/1`)

### 2. **State Management**
- **Before**: Class-based state with manual DOM manipulation
- **After**: React Context API with hooks for global state

### 3. **Component Reusability**
- **Before**: String templates with innerHTML
- **After**: Reusable React components with props

### 4. **Event Handling**
- **Before**: Manual event listeners with delegation issues
- **After**: React's synthetic events with proper onClick handlers

### 5. **Data Flow**
- **Before**: Direct DOM updates and global variables
- **After**: Unidirectional data flow with props and state

## Lesson Navigation Fix

The main issue in the vanilla JS version was lesson items not being clickable. In React, this is solved with:

```jsx
<div
  className="lesson-item"
  onClick={() => openLesson(module.id, lesson.id)}
>
  {/* Lesson content */}
</div>
```

The `openLesson` function uses React Router's `navigate`:

```javascript
const navigate = useNavigate();

const openLesson = (moduleId, lessonId) => {
  navigate(`/lesson/${moduleId}/${lessonId}`);
};
```

## API Service Layer

All API calls are centralized in `src/services/api.js`:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Auto-attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('codequest_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const curriculumAPI = {
  getCurriculum: () => api.get('/curriculum'),
  getLesson: (id) => api.get(`/lesson/${id}`)
};
```

## Authentication Flow

1. User logs in via `Auth.js`
2. JWT token stored in localStorage
3. `AuthContext` provides user state globally
4. Protected routes check authentication
5. API requests auto-include token

## Technologies Used

- **React 18** - UI library
- **React Router 6** - Client-side routing
- **Axios** - HTTP client
- **Context API** - State management
- **Tailwind CSS** - Styling (via CDN)
- **Feather Icons React** - Icon components

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Tips

### Hot Reload
React dev server supports hot module replacement - changes appear instantly without full page reload.

### React DevTools
Install React DevTools browser extension to inspect component hierarchy and state.

### Debugging
Use browser console and React DevTools to debug:
- Component props and state
- Context values
- API calls (Network tab)

## Future Enhancements

- [ ] Profile page with achievements
- [ ] Playground (free-form code editor)
- [ ] Parent dashboard
- [ ] Real-time code collaboration
- [ ] Code syntax highlighting (Monaco Editor)
- [ ] Blockly visual programming integration
- [ ] Leaderboard
- [ ] Social features (share code)

## License

MIT License - Educational use encouraged!

## Support

For issues or questions, check the console for errors and ensure:
1. Backend server is running on port 3000
2. React dev server is running on port 3001
3. Database is initialized (`codequest.db` exists)

---

**Happy Coding! 🎉**

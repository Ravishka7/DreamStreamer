import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Authenticator, withAuthenticator, ThemeProvider, defaultTheme } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsExports from './aws-exports';
import Home from './pages/Home';
import DreamStreamer from './components/DreamStreamer/DreamStreamer';
import AdminDashboard from './pages/AdminDashboard';

// Import fetchAuthSession from @aws-amplify/auth
import { fetchAuthSession } from '@aws-amplify/auth';

Amplify.configure(awsExports);

// Custom theme for black and red
const customTheme = {
  name: 'custom-theme',
  overrides: [
    {
      colorMode: 'dark',
      tokens: {
        colors: {
          background: { primary: { value: '#000000' } }, // Set background to black
          font: {
            primary: { value: '#FFFFFF' }, // Set text to white
            secondary: { value: '#FF0000' }, // Set secondary text to red
          },
          brand: {
            primary: {
              '10': { value: '#FF0000' }, // Set primary brand color to red
            },
          },
          border: {
            primary: { value: '#FF0000' }, // Set borders to red
          },
          button: {
            primary: {
              backgroundColor: { value: '#FF0000' }, // Set primary button background to red
              color: { value: '#FFFFFF' }, // Set primary button text color to white
            },
            secondary: {
              backgroundColor: { value: '#000000' }, // Set secondary button background to black
              color: { value: '#FF0000' }, // Set secondary button text color to red
            },
          },
        },
      },
    },
  ],
};

function App({ signOut }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchAuthSession()
      .then((session) => {
        console.log('Session:', session); // Debug: Log the session object

        const accessToken = session.tokens?.accessToken?.toString();
        if (!accessToken) {
          console.error('Access Token is missing in the session object');
          return;
        }

        const groups = session.tokens.accessToken.payload['cognito:groups'];
        console.log('User Groups:', groups); // Debug: Log the groups
        if (groups && groups.includes('Admin')) {
          console.log('Redirecting to /admin');
          setIsAdmin(true);
          navigate('/admin');
        } else {
          console.log('Redirecting to /dreamstreamer');
          navigate('/dreamstreamer');
        }
      })
      .catch((error) => {
        console.error('Error fetching session:', error);
        navigate('/home');
      });
  }, [navigate]);

  return (
    <Routes>
      <Route path="/home" element={<Home signOut={signOut} />} />
      <Route path="/dreamstreamer" element={<DreamStreamer signOut={signOut} />} />
      {isAdmin && <Route path="/admin" element={<AdminDashboard signOut={signOut} />} />}
    </Routes>
  );
}

function AppWithAuth() {
  return (
    <ThemeProvider theme={customTheme}>
      <Router>
        <Authenticator>
          {({ signOut }) => <App signOut={signOut} />}
        </Authenticator>
      </Router>
    </ThemeProvider>
  );
}

export default withAuthenticator(AppWithAuth);

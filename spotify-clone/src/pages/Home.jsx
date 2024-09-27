import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-6">Welcome to DreamStreamer</h1>
      <button
        onClick={() => navigate('/login')}
        className="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
      >
        Login
      </button>
    </div>
  );
};

export default Home;

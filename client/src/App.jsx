import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminPanel from './components/AdminPanel';
import UserPanel from './components/UserPanel';
import Login from './components/Login';
import Register from './components/Register';
import { Toaster } from 'react-hot-toast';
import './App.css';


function App() {
    return (
        <Router>
            <Toaster position="top-right" />
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />

                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/user" element={<UserPanel />} />
            </Routes>
        </Router>
    );
}

export default App;
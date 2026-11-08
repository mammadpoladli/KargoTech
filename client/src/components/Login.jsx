import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Login = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:3001/api/login', formData);
            localStorage.setItem('currentUser', JSON.stringify(res.data));
            toast.success(`Hoşgeldin ${res.data.username}!`);
            navigate(res.data.role === 'admin' ? '/admin' : '/user');
        } catch (error) {
            toast.error(error.response?.data?.error || "Giriş başarısız.");
        }
    };

    return (
        <div className="hero-section">
            <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '40px', backdropFilter: 'blur(10px)', backgroundColor: 'rgba(30, 41, 59, 0.8)' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '2rem', margin: '0 0 10px 0' }}>📦 KargoTech</h1>
                    <p style={{ color: '#94a3b8' }}>Lojistik Yönetim Sistemi</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" style={{display:'block', marginBottom:'8px', fontSize:'0.9rem', color:'#cbd5e1'}}>Kullanıcı Adı</label>
                        <input
                            type="text"
                            name="username"
                            className="form-input"
                            placeholder="Örn: admin"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{display:'block', marginBottom:'8px', fontSize:'0.9rem', color:'#cbd5e1'}}>Şifre</label>
                        <input
                            type="password"
                            name="password"
                            className="form-input"
                            placeholder="••••••"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', padding:'12px' }}>
                        Giriş Yap
                    </button>
                </form>

                <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '0.9rem' }}>
                    <span style={{ color: '#64748b' }}>Hesabın yok mu? </span>
                    <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
                        Hemen Kayıt Ol
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Register = () => {
    const [formData, setFormData] = useState({ username: '', password: '', role: 'user' });
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:3001/api/register', formData);
            toast.success("Kayıt başarılı! Giriş yapabilirsiniz.");
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.error || "Kayıt başarısız.");
        }
    };

    return (
        <div className="hero-section">
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                <h2 style={{ textAlign: 'center' }}>📝 Müşteri Kaydı</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Kullanıcı Adı</label>
                        <input type="text" name="username" className="form-input" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Şifre</label>
                        <input type="password" name="password" className="form-input" onChange={handleChange} required />
                    </div>

                    <input type="hidden" name="role" value="user" />

                    <button type="submit" className="btn btn-success" style={{ width: '100%' }}>Kayıt Ol</button>
                </form>
                <p style={{ marginTop: '15px', textAlign: 'center', color: '#aaa' }}>
                    Zaten üye misin? <Link to="/login" style={{ color: '#3b82f6' }}>Giriş Yap</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
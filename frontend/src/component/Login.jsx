import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import logo1 from '../assets/FinalLogo.png';
import './Login.css'; // You might want to create a separate Login.css

const Login = () => {
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const navigate = useNavigate();

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 5000); // Hide after 5 seconds
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPass.trim()) {
      setLoginError('Please enter username and password');
      return;
    }

    try {
      setIsLoggingIn(true);
      setLoginError('');
      
      // Simulate login logic
      if (loginUser === 'admin' && loginPass === 'admin') {
        showNotification('success', 'Successfully logged in!');
        navigate('/admin'); // Redirect to admin page
      } else {
        setLoginError('Invalid credentials. Please try again.');
        showNotification('error', 'Invalid credentials.');
      }
    } catch (error) {
      setLoginError(error.message || 'Login failed. Please try again.');
      showNotification('error', 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };


  return (
    <main className="main-login">
      <section className="login-container">
        <div className="login-headers">
          <div className="login-brands">
            <div className="brand-boxs">
              <div className="app-titles">
                <img src={logo1} alt="Thames" />
              </div>
            </div>
          </div>
          <h1 className="login-welcome">Welcome Back!!</h1>
          <p className="login-subtitle">Please Login to your account</p>
        </div>

        <div className="login-form-wrapper">
          <h2 className="login-form-title">USER LOGIN</h2>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group-with-icon">
              <div className="input-icon">
                {/* Icon here */}
              </div>
              <input
                id="username"
                type="text"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="Username"
                required
                disabled={isLoggingIn}
                className="form-input-styled"
                autoComplete="username"
              />
            </div>

            <div className="form-group-with-icon">
              <div className="input-icon">
                {/* Icon here */}
              </div>
              <input
                id="password"
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Password"
                required
                disabled={isLoggingIn}
                className="form-input-styled"
                autoComplete="current-password"
              />
            </div>

            {loginError && <p role="alert" className="form-error">{loginError}</p>}

            <button type="submit" disabled={isLoggingIn} className="btn-login-styled">
              {isLoggingIn ? (
                <>
                  <Loader size={24} className="loader-spin" />
                  Signing In...
                </>
              ) : (
                'LOGIN'
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Login;

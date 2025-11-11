/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov
 *
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Login.css';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const { login } = useAuth();
  const navigate = useNavigate();
  const lastAttemptRef = useRef<number>(0);
  const attemptCountRef = useRef<number>(0);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptRef.current;
    
    // Prevent rapid successive attempts (minimum 2 seconds between attempts)
    if (timeSinceLastAttempt < 2000) {
      toast.error('Please wait a moment before trying again.');
      return;
    }
    
    // Track attempts and implement client-side rate limiting
    attemptCountRef.current += 1;
    lastAttemptRef.current = now;
    
    // Reset attempt count after 5 minutes
    if (attemptCountRef.current > 5) {
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      if (lastAttemptRef.current < fiveMinutesAgo) {
        attemptCountRef.current = 1;
      }
    }
    
    // Block if too many attempts in short time
    if (attemptCountRef.current > 5) {
      toast.error('Too many login attempts. Please wait 5 minutes before trying again.');
      return;
    }
    
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      // Reset attempt count on successful login
      attemptCountRef.current = 0;
      navigate('/control-panel');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle rate limiting with specific messaging
      if (error.response?.status === 429) {
        const retryAfter = error.retryAfterSeconds || 30;
        toast.error(
          `Too many login attempts. Please wait ${retryAfter} seconds before trying again.`,
          { duration: 8000 }
        );
        
        // Start cooldown timer
        setCooldownTime(retryAfter);
        cooldownIntervalRef.current = setInterval(() => {
          setCooldownTime(prev => {
            if (prev <= 1) {
              if (cooldownIntervalRef.current) {
                clearInterval(cooldownIntervalRef.current);
                cooldownIntervalRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (error.response?.status === 401) {
        toast.error('Invalid email or password. Please check your credentials.');
      } else if (error.response?.status === 403) {
        toast.error('Account access denied. Please contact support.');
      } else if (error.response?.status >= 500) {
        toast.error('Server error. Please try again later.');
      } else if (!error.response) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(error.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="ezpass-login">
      <div className="container narrow">
        <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && (
              <span className="error-message">{errors.email.message}</span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
              className={errors.password ? 'error' : ''}
            />
            {errors.password && (
              <span className="error-message">{errors.password.message}</span>
            )}
          </div>
          <button type="submit" disabled={isLoading || cooldownTime > 0}>
            {isLoading ? 'Logging in...' : cooldownTime > 0 ? `Wait ${cooldownTime}s` : 'Login'}
          </button>
          {cooldownTime > 0 && (
            <div className="cooldown-message">
              Please wait {cooldownTime} seconds before trying again.
            </div>
          )}
        </form>
      </div>
    </section>
  );
};

export default Login;

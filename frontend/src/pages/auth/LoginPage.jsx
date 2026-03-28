// D:\Grand_Valley_College\frontend\src\pages\LoginPage.jsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { setAuthSession } from '../../lib/auth';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'; // Using Lucide for icons

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from || '/';

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const resp = await api.post('/auth/login', { email, password });
      if (!resp.token) throw new Error('Authentication failed: no token received.');
      setAuthSession(resp.token, resp.user, resp.permissions, resp.roles);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Check your email and password then try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // Background with a subtle GVC brand gradient
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-background via-white to-surface-muted p-4">
      <Card className="w-full max-w-sm border-border-strong shadow-panel bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-1 items-center ">
          <img src="/gvc_logo.png" alt="GVC Logo" className="h-16 w-16 rounded-full" />
          <span>Grand Valley College</span>
        </CardHeader>
        
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-brand-ink ml-1">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@gvc.edu"
                  // Removed focus ring, added a subtle border-color shift
                  className="pl-10 bg-white border-border-strong focus:border-brand-blue focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-brand-ink ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 bg-white border-border-strong focus:border-brand-blue focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-blue transition-colors"
                >
                  {showPassword ? <EyeOff h-4 w-4 /> : <Eye h-4 w-4 />}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-[12px] text-red-600 border border-red-100 animate-in fade-in zoom-in duration-200">
                {error}
              </div>
            )}

            {/* Button with Brand Gradient */}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-brand-blue to-[#1e5eb0] hover:opacity-90 text-white font-bold h-11 shadow-md transition-all active:scale-[0.98]" 
              disabled={submitting}
            >
              {submitting ? 'Authenticating...' : 'Sign in'}
            </Button>

            <p className="text-center text-[11px] text-slate-400 pt-2">
              Internal use only &copy; 2026 Grand Valley College
            </p>
          </form>
        </CardContent>
      </Card>
    </div>  
  );
}
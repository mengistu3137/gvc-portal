// D:\Grand_Valley_College\frontend\src\pages\ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/auth/forgot', { email });
      setSent(true);
    } catch (err) {
      setError(err.message || 'We could not find an account with that email.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-background to-white p-4">
        <Card className="w-full max-w-sm border-border-strong shadow-panel text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-xl text-brand-blue">Check your email</CardTitle>
            <p className="text-sm text-slate-500 px-4">
              We have sent a password reset link to <span className="font-semibold text-brand-ink">{email}</span>.
            </p>
            <Link to="/login" className="inline-flex items-center text-sm font-semibold text-brand-blue hover:underline pt-2">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-background via-white to-surface-muted p-4">
      <Card className="w-full max-w-sm border-border-strong shadow-panel bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center items-center">
          <CardTitle className="text-2xl font-bold text-brand-blue tracking-tight">Forgot password?</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-brand-ink ml-1">College email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email to receive a reset link"
                  className="pl-10 bg-white border-border-strong focus:border-brand-blue focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                  required
                />
              </div>
            </div>
            {error && <div className="rounded-lg bg-red-50 p-3 text-[12px] text-red-600 border border-red-100">{error}</div>}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-brand-blue to-[#1e5eb0] text-white font-bold h-11 shadow-md transition-all active:scale-[0.98]" 
              disabled={submitting}
            >
              {submitting ? 'Sending...' : 'Send reset link'}
            </Button>
            <div className="text-center">
              <Link to="/login" className="text-xs font-semibold text-brand-blue hover:underline inline-flex items-center">
                <ArrowLeft className="mr-1 h-3 w-3" /> Back to sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
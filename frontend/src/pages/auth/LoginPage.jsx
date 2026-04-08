import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { setAuthSession } from '../../lib/auth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Eye, EyeOff, Lock, Mail, ChevronDown, 
  Menu, X, Clock, ExternalLink 
} from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // UI State
  const [latestNews, setLatestNews] = useState(null);
  const [occupations, setOccupations] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProgramsOpen, setIsProgramsOpen] = useState(false);

  const from = location.state?.from || '/';

  // Fetch Occupations (Programs) from backend
 // Fetch Occupations (Programs) from backend
useEffect(() => {
  const fetchPrograms = async () => {
    try {
      const response = await api.get(`/academics/occupations/public`);
      
    
      const programs = response.payload || response.data?.payload || [];
      
      setOccupations(programs);
    } catch (err) {
      console.error("Failed to fetch programs:", err);
      setOccupations([]); // Fallback
    }
  };
  fetchPrograms();
}, []);
useEffect(() => {
  const fetchNews = async () => {
    try {
      const resp = await api.get('/announcements/latest');
      // console.log("announcement", resp)
      
      // Update this line to use .data instead of .payload
      const news = resp.data || resp.payload || null; 
      setLatestNews(news);
    } catch (err) { 
      console.error("News fetch error:", err); 
    }
  };
  fetchNews();
}, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const resp = await api.post('/auth/login', { email, password });
      setAuthSession(resp.token, resp.user, resp.permissions, resp.roles);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* --- NAVBAR --- */}
      <nav className="bg-[#0a4da3] text-white px-4 py-3 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/gvc_logo.png" alt="GVC Logo" className="h-10 w-10 bg-white rounded-full p-0.5" />
            <span className="font-bold tracking-tight hidden sm:inline">Grand Valley College</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="hover:text-brand-yellow transition-colors">Home</Link>
               {/* Programs Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1 hover:text-brand-yellow transition-colors">
                Programs <ChevronDown className="h-4 w-4" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-64 bg-white text-slate-800 shadow-xl rounded-lg border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-2">
                {occupations.map((occ) => (
                  <div key={occ.occupation_id} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-[13px]">
                    {occ.occupation_name} 
                  </div>
                ))}
              </div>
            </div>
            <Link to="/" className="hover:text-brand-yellow transition-colors">Announcement</Link>
            
         
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl p-6 space-y-6">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Navigation</p>
             <nav className="flex flex-col gap-4 font-medium text-slate-700">
                <Link to="#">Home</Link>
                <Link to="#">Announcement</Link>
                <div className="space-y-2">
                  <button onClick={() => setIsProgramsOpen(!isProgramsOpen)} className="flex items-center justify-between w-full">
                    Programs <ChevronDown className={`h-4 w-4 transform ${isProgramsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isProgramsOpen && (
                    <div className="pl-4 space-y-2 text-sm text-slate-500 max-h-48 overflow-y-auto">
                      {occupations.map(occ => <p key={occ.occupation_id}>{occ.occupation_name}</p>)}
                    </div>
                  )}
                </div>
             </nav>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 md:p-8 gap-8 items-start">
        
     {/* Left Side: Announcement (Hero Section) */}
<div className="w-full md:w-3/5 space-y-6">
  
  {/* 1. STATIC WELCOME SECTION */}
  <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
      Grand Valley College TVET Academic Programs
    </h1>
   
    <div className="h-1 w-20 bg-[#0a4da3] mb-6" />
    
    <p className="text-slate-600 leading-relaxed">
      Welcome to the official GVC Portal. Our TVET programs are designed to provide industry-standard 
      technical skills in health, technology, and business sectors.
    </p>
  </div>

  {/* 2. DYNAMIC ANNOUNCEMENT SECTION */}
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
    
    {/* Dynamic Image Header */}
    <div className="h-48 md:h-64 overflow-hidden bg-slate-100 flex items-center justify-center border-b border-slate-100">
      <img 
        src={latestNews?.image_url || "/gvc_logo.png"} 
        alt="Announcement" 
        className={`w-full h-full transition-transform duration-500 hover:scale-105 ${latestNews?.image_url ? 'object-cover' : 'object-contain p-12 opacity-20'}`}
        onError={(e) => { 
          e.target.src = "/gvc_logo.png"; 
          e.target.className="w-full h-full object-contain p-12 opacity-20"; 
        }}
      />
    </div>

    <div className="p-8 pt-6">
      <div className="flex items-center gap-2 text-slate-400 text-[11px] mb-3 uppercase tracking-[0.1em] font-bold">
        <Clock className="h-3.5 w-3.5 text-[#0a4da3]" /> 
        <span>
          {latestNews?.published_at 
            ? new Date(latestNews.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) 
            : "Recent Announcement"}
        </span>
      </div>

      <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 leading-tight">
        {latestNews?.title || "No Current Announcements"}
      </h2>

      <div className="h-0.5 w-12 bg-slate-200 mb-6" />
      
      <p className="text-slate-600 leading-relaxed mb-8 text-[15px]">
        {latestNews?.content || "Check back later for news, updates, and upcoming events from Grand Valley College."}
      </p>
      
     
    </div>
  </div>

</div>
      

        {/* Right Side: Login Card */}
        <div className="w-full md:w-2/5 flex flex-col items-center">
          <div className="w-full max-w-[400px] bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="p-8 text-center">
              <img src="/gvc_logo.png" alt="GVC" className="h-24 w-24 mx-auto mb-4 rounded-full" />
              <h2 className="text-slate-600 font-medium italic mb-1">Building Excellence!</h2>
              <h3 className="text-slate-800 font-bold text-lg">Welcome to GVC Portal System</h3>
            </div>

            <form onSubmit={onSubmit} className="p-8 pt-0 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-700">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email"
                    className="pl-10 border-slate-200 focus:border-[#0a4da3] focus-visible:ring-0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    className="pl-10 pr-10 border-slate-200 focus:border-[#0a4da3] focus-visible:ring-0"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300 text-[#0a4da3]" />
                  Remember Me
                </label>
                <Link to="/forgot-password" size="sm" className="text-xs text-[#0a4da3] font-semibold hover:underline">
                  Forgot Password?
                </Link>
              </div>

              {error && <div className="text-[12px] text-red-500 font-medium bg-red-50 p-2 rounded border border-red-100">{error}</div>}

              <Button 
                type="submit" 
                className="w-full bg-[#0a4da3] hover:bg-[#083d82] text-white font-bold h-11 transition-all"
                disabled={submitting}
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </div>
          
          <p className="mt-6 text-[11px] text-slate-400 flex items-center gap-1">
             <ExternalLink className="h-3 w-3" /> portal.gvc.edu.et
          </p>
        </div>
      </main>
    </div>
  );
}
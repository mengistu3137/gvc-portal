import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { BookOpen, Users, CheckCircle, Search, Calendar, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GradeDrawer } from '../components/grading/GradeDrawer';

export  function GradeEntry() {
  const [offerings, setOfferings] = useState([]);
  const [filteredOfferings, setFilteredOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drawer State
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    fetchInstructorClasses();
  }, []);

  const fetchInstructorClasses = async () => {
    try {
      setLoading(true);
      // Fetch offerings. In a real app, you might filter by the logged-in user's ID if they are an instructor.
      // For now, we fetch all to demonstrate the UI.
      const res = await api.get('/offerings'); 
      console.log("offerings", res)
      setOfferings(res.rows || []);
      setFilteredOfferings(res.data || []);
    } catch (error) {
      toast.error("Failed to load your classes");
    } finally {
      setLoading(false);
    }
  };

  // Search Filter
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = offerings.filter(o => 
      o.module?.unit_competency?.toLowerCase().includes(term) ||
      o.module?.m_code?.toLowerCase().includes(term) ||
      o.batch?.batch_code?.toLowerCase().includes(term)
    );
    setFilteredOfferings(filtered);
  }, [searchTerm, offerings]);

  const handleCardClick = (offering) => {
    setSelectedOffering(offering);
    setIsDrawerOpen(true);
  };

  return (
    <div className="p-6 space-y-6 bg-brand-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">My Classes</h1>
          <p className="text-slate-500 text-sm font-medium">Manage grades, assessments, and attendance for your active modules.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="bg-white text-slate-700 border-border-strong">
             <Calendar size={16} className="mr-2" /> Schedule
           </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by module name, code, or batch..."
          className="pl-10 h-12 bg-white border-border-strong shadow-sm focus:ring-2 focus:ring-primary/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Class Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-primary animate-pulse">Loading your classes...</div>
      ) : filteredOfferings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-border-strong text-slate-400">
          No classes found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredOfferings.map((offering) => (
            <div
              key={offering.offering_id}
              onClick={() => handleCardClick(offering)}
              className="group relative bg-white rounded-xl border border-border-strong p-6 shadow-sm hover:shadow-panel hover:border-brand-blue/40 transition-all cursor-pointer"
            >
              {/* Status Indicator */}
              <div className="absolute top-4 right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>

              {/* Module Info */}
              <div className="mb-4 pr-6">
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  {offering.module?.m_code}
                </div>
                <h3 className="font-bold text-brand-ink text-lg leading-tight mb-1 group-hover:text-brand-blue transition-colors">
                  {offering.module?.unit_competency}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                  <MapPin size={12} />
                  <span>Sec {offering.section_code}</span>
                  <span>•</span>
                  <span>{offering.batch?.batch_code}</span>
                </div>
              </div>

              {/* Footer Stats */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-slate-400" />
                  <span>{offering.capacity || 0} Capacity</span>
                </div>
                <div className="flex items-center gap-1.5 text-brand-blue">
                   <BookOpen size={14} />
                   <span>Manage</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side Drawer for Grading */}
      <GradeDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        offering={selectedOffering} 
      />
    </div>
  );
}
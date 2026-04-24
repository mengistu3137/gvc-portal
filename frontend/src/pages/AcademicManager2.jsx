import React, { useState } from 'react';

import { LayoutGrid, BookOpen, Layers, Users, Calendar } from 'lucide-react';
import SectorTab from '../components/academics/SectorTab';
import OccupationTab from '../components/academics/OccupationTab';
import ModuleTab from '../components/academics/ModuleTab';
import BatchTab from '../components/academics/BatchTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';

export  function AcademicManager() {
  return (
    <div className="p-6 space-y-6 bg-brand-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Academic Management</h1>
          <p className="text-slate-500 text-sm font-medium">Configure sectors, occupations, modules, and batches.</p>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="sectors" className="w-full">
        <TabsList className="bg-brand-surface border border-border-strong p-1 w-full md:w-auto grid grid-cols-2 md:grid-cols-4 gap-1">
          <TabsTrigger value="sectors" className="data-[state=active]:bg-brand-blue data-[state=active]:text-white">
            <LayoutGrid className="mr-2 h-4 w-4" /> Sectors
          </TabsTrigger>
          <TabsTrigger value="occupations" className="data-[state=active]:bg-brand-blue data-[state=active]:text-white">
            <BookOpen className="mr-2 h-4 w-4" /> Occupations
          </TabsTrigger>
          <TabsTrigger value="modules" className="data-[state=active]:bg-brand-blue data-[state=active]:text-white">
            <Layers className="mr-2 h-4 w-4" /> Modules
          </TabsTrigger>
          <TabsTrigger value="batches" className="data-[state=active]:bg-brand-blue data-[state=active]:text-white">
            <Users className="mr-2 h-4 w-4" /> Batches
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="sectors">
            <SectorTab />
          </TabsContent>
          <TabsContent value="occupations">
            <OccupationTab />
          </TabsContent>
          <TabsContent value="modules">
            <ModuleTab />
          </TabsContent>
          <TabsContent value="batches">
            <BatchTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
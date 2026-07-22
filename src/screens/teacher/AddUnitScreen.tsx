import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { subjects } from '@/data/subjects';

export default function AddUnitScreen() {
  const [subject, setSubject] = useState('');
  const [number, setNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [added, setAdded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <>
      <AppHeader title="Add Unit" showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          {added ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <Check size={40} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Unit Added!</h2>
              <p className="text-sm text-gray-500">The unit has been created successfully.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select a subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <Input label="Unit Number" placeholder="e.g., 1" value={number} onChange={(e) => setNumber(e.target.value)} />
              <Input label="Unit Title" placeholder="e.g., Introduction to DBMS" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the unit..."
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
              <Button fullWidth size="lg" type="submit">
                <span className="flex items-center justify-center gap-2">
                  <Plus size={18} />
                  Add Unit
                </span>
              </Button>
            </form>
          )}
        </div>
      </PageContainer>
      <TeacherBottomNav />
    </>
  );
}

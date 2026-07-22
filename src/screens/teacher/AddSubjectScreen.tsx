import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function AddSubjectScreen() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState('');
  const [description, setDescription] = useState('');
  const [semester, setSemester] = useState('');
  const [added, setAdded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <>
      <AppHeader title="Add Subject" showBack />
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
              <h2 className="text-lg font-bold text-gray-900 mb-1">Subject Added!</h2>
              <p className="text-sm text-gray-500">The subject has been created successfully.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input label="Subject Name" placeholder="e.g., Data Structures" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Subject Code" placeholder="e.g., CS3501" value={code} onChange={(e) => setCode(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Credits" placeholder="e.g., 4" value={credits} onChange={(e) => setCredits(e.target.value)} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Select</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the subject..."
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
              <Button fullWidth size="lg" type="submit">
                <span className="flex items-center justify-center gap-2">
                  <Plus size={18} />
                  Add Subject
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

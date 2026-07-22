import { useState } from 'react';
import { Search } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import SubjectCard from '@/components/cards/SubjectCard';
import { subjects } from '@/data/subjects';

export default function SubjectsScreen() {
  const [search, setSearch] = useState('');
  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <AppHeader title="Subjects" showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          <div className="relative mb-5">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="space-y-3">
            {filtered.map((subject, i) => (
              <SubjectCard key={subject.id} subject={subject} index={i} />
            ))}
          </div>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}

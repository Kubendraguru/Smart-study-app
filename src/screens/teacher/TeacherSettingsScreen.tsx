import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Building,
  Mail,
  Shield,
  Save,
  Check,
  Award,
  Loader2,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { getProfile, updateProfile } from '@/service/auth';

export default function TeacherSettingsScreen() {
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [department, setDepartment] = useState('');
  const [college, setCollege] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const designations = [
    'Assistant Professor',
    'Associate Professor',
    'Professor',
    'Head of Department (HOD)',
    'Visiting Faculty',
    'Lecturer',
  ];

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const profile = await getProfile(user.id);
        if (profile) {
          setFullName(profile.full_name || '');
          setDesignation(profile.designation || 'Assistant Professor');
          setDepartment(profile.department || '');
          setCollege(profile.college || '');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        designation: designation.trim(),
        department: department.trim(),
        college: college.trim(),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppHeader title="Faculty Settings" showBack />
      <PageContainer showBottomNav>
        <div className="pt-4">
          {loading ? (
            <div className="text-center py-20 text-gray-500 text-sm">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
              Loading profile settings...
            </div>
          ) : (
            <div className="space-y-5">
              {/* Profile Card Summary */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-2xl border-2 border-blue-100">
                  {fullName ? fullName.charAt(0).toUpperCase() : 'T'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{fullName || 'Faculty Member'}</h2>
                  <p className="text-xs text-blue-600 font-semibold">{designation}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{department || 'Academic Department'}</p>
                </div>
              </motion.div>

              {saved && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-sm font-semibold"
                >
                  <Check size={18} className="text-emerald-600" />
                  Profile settings updated successfully!
                </motion.div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="e.g., Dr. Rajesh Kumar"
                  icon={<User size={18} />}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Academic Title / Designation
                  </label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {designations.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Department"
                  placeholder="e.g., Computer Science & Engineering"
                  icon={<Building size={18} />}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />

                <Input
                  label="College / Institution"
                  placeholder="e.g., University College of Engineering"
                  icon={<Award size={18} />}
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                />

                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
                  <span className="text-xs text-gray-500 block mb-1 font-medium">Linked Email</span>
                  <span className="text-sm font-semibold text-gray-800">{user?.email || 'N/A'}</span>
                </div>

                <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100 flex items-center gap-2.5">
                  <Shield size={18} className="text-blue-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-blue-900">
                    Role: Faculty Member (Verified Instructor)
                  </span>
                </div>

                <Button fullWidth size="lg" type="submit" disabled={saving}>
                  {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                  Save Profile Settings
                </Button>
              </form>
            </div>
          )}
        </div>
      </PageContainer>
      <TeacherBottomNav />
    </>
  );
}

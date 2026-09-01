import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Check } from 'lucide-react';

import PageContainer from '@/components/layout/PageContainer';
import AppHeader from '@/components/layout/AppHeader';
import TeacherBottomNav from '@/components/layout/TeacherBottomNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type Subject = {
  id: string;
  subject_name: string;
  subject_code: string;
};

type Unit = {
  id: string;
  unit_number: number;
  unit_title: string;
};

export default function AddPdfScreen() {
  const { user } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [subjectId, setSubjectId] = useState('');
  const [unitId, setUnitId] = useState('');

  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [added, setAdded] = useState(false);

  // ----------------------------------------
  // Load subjects
  // ----------------------------------------

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    setLoadingSubjects(true);

    const { data, error } = await supabase
      .from('subjects')
      .select('id, subject_name, subject_code')
      .order('subject_name', {
        ascending: true,
      });

    if (error) {
      console.error('Error loading subjects:', error);
      alert(error.message);
      setLoadingSubjects(false);
      return;
    }

    setSubjects(data ?? []);
    setLoadingSubjects(false);
  }

  // ----------------------------------------
  // Load units
  // ----------------------------------------

  useEffect(() => {
    if (!subjectId) {
      setUnits([]);
      setUnitId('');
      return;
    }

    loadUnits();
  }, [subjectId]);

  async function loadUnits() {
    setLoadingUnits(true);

    const { data, error } = await supabase
      .from('units')
      .select('id, unit_number, unit_title')
      .eq('subject_id', subjectId)
      .order('unit_number', {
        ascending: true,
      });

    if (error) {
      console.error('Error loading units:', error);
      alert(error.message);
      setLoadingUnits(false);
      return;
    }

    setUnits(data ?? []);
    setUnitId('');
    setLoadingUnits(false);
  }

  // ----------------------------------------
  // Upload PDF
  // ----------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      alert('Please login first.');
      return;
    }

    if (!subjectId) {
      alert('Please select a subject.');
      return;
    }

    if (!unitId) {
      alert('Please select a unit.');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title.');
      return;
    }

    if (!file) {
      alert('Please select a PDF.');
      return;
    }

    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed.');
      return;
    }

    setUploading(true);

    try {
      // ----------------------------------------
      // 1. Create unique storage path
      // ----------------------------------------

      const filePath =
        `${subjectId}/${unitId}/${Date.now()}-${file.name}`;

      // ----------------------------------------
      // 2. Upload file
      // ----------------------------------------

      const { error: uploadError } =
        await supabase.storage
          .from('pdfs')
          .upload(filePath, file);

      if (uploadError) {
        console.error(
          'PDF upload error:',
          uploadError
        );

        alert(uploadError.message);
        return;
      }

      // ----------------------------------------
      // 3. Get public URL
      // ----------------------------------------

      const { data: urlData } =
        supabase.storage
          .from('pdfs')
          .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;

      // ----------------------------------------
      // 4. Save database record
      // ----------------------------------------

      const { error: materialError } =
        await supabase
          .from('materials')
          .insert({
            unit_id: unitId,
            title: title.trim(),
            file_name: file.name,
            file_url: fileUrl,
            material_type: 'pdf',
          });

      if (materialError) {
        console.error(
          'Material insert error:',
          materialError
        );

        // Delete uploaded file if database fails
        await supabase.storage
          .from('pdfs')
          .remove([filePath]);

        alert(materialError.message);
        return;
      }

      // ----------------------------------------
      // Success
      // ----------------------------------------

      setAdded(true);

      setSubjectId('');
      setUnitId('');
      setTitle('');
      setFile(null);
      setUnits([]);

      setTimeout(() => {
        setAdded(false);
      }, 2000);

    } catch (error) {
      console.error(error);
      alert('Something went wrong.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <AppHeader
        title="Add PDF / Notes"
        showBack
      />

      <PageContainer showBottomNav>
        <div className="pt-4">

          {added ? (
            <motion.div
              initial={{
                scale: 0.8,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <Check
                  size={40}
                  className="text-emerald-600"
                />
              </div>

              <h2 className="text-lg font-bold text-gray-900 mb-1">
                PDF Added!
              </h2>

              <p className="text-sm text-gray-500">
                PDF / Notes uploaded successfully.
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* SUBJECT */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Subject
                </label>

                <select
                  value={subjectId}
                  onChange={(e) =>
                    setSubjectId(e.target.value)
                  }
                  disabled={loadingSubjects}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">
                    {loadingSubjects
                      ? 'Loading subjects...'
                      : 'Select a subject'}
                  </option>

                  {subjects.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                    >
                      {s.subject_code} —{' '}
                      {s.subject_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* UNIT */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Unit
                </label>

                <select
                  value={unitId}
                  onChange={(e) =>
                    setUnitId(e.target.value)
                  }
                  disabled={
                    !subjectId ||
                    loadingUnits
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">
                    {!subjectId
                      ? 'Select subject first'
                      : loadingUnits
                      ? 'Loading units...'
                      : 'Select a unit'}
                  </option>

                  {units.map((unit) => (
                    <option
                      key={unit.id}
                      value={unit.id}
                    >
                      Unit {unit.unit_number} —{' '}
                      {unit.unit_title}
                    </option>
                  ))}
                </select>
              </div>

              {/* TITLE */}

              <Input
                label="PDF / Notes Title"
                placeholder="e.g. Unit 1 Complete Notes"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
              />

              {/* FILE */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  PDF File
                </label>

                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition">

                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                    <FileText
                      size={24}
                      className="text-red-500"
                    />
                  </div>

                  {file ? (
                    <>
                      <p className="text-sm font-semibold text-gray-800 text-center">
                        {file.name}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {(
                          file.size /
                          1024 /
                          1024
                        ).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-700">
                        Select PDF
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        PDF files only
                      </p>
                    </>
                  )}

                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const selected =
                        e.target.files?.[0];

                      if (selected) {
                        setFile(selected);
                      }
                    }}
                  />
                </label>
              </div>

              {/* UPLOAD */}

              <Button
                fullWidth
                size="lg"
                type="submit"
                disabled={uploading}
              >
                <span className="flex items-center justify-center gap-2">
                  <Upload size={18} />

                  {uploading
                    ? 'Uploading...'
                    : 'Upload PDF'}
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
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  UploadCloud,
  Check,
} from 'lucide-react';

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

export default function UploadPdfScreen() {
  const { user } = useAuth();

  // ----------------------------------------
  // Form state
  // ----------------------------------------

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // ----------------------------------------
  // Database state
  // ----------------------------------------

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // ----------------------------------------
  // Upload state
  // ----------------------------------------

  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  // ----------------------------------------
  // Load subjects from Supabase
  // ----------------------------------------

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    setLoadingSubjects(true);

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select(
          'id, subject_name, subject_code'
        )
        .order('subject_name', {
          ascending: true,
        });

      if (error) {
        console.error(
          'Error loading subjects:',
          error
        );

        alert(error.message);
        return;
      }

      setSubjects(data ?? []);
    } catch (error) {
      console.error(
        'Unexpected subject loading error:',
        error
      );
    } finally {
      setLoadingSubjects(false);
    }
  }

  // ----------------------------------------
  // Load units when subject changes
  // ----------------------------------------

  useEffect(() => {
    if (!subjectId) {
      setUnits([]);
      setUnitId('');
      return;
    }

    loadUnits(subjectId);
  }, [subjectId]);

  async function loadUnits(selectedSubjectId: string) {
    setLoadingUnits(true);
    setUnits([]);
    setUnitId('');

    try {
      const { data, error } = await supabase
        .from('units')
        .select(
          'id, unit_number, unit_title'
        )
        .eq(
          'subject_id',
          selectedSubjectId
        )
        .order('unit_number', {
          ascending: true,
        });

      if (error) {
        console.error(
          'Error loading units:',
          error
        );

        alert(error.message);
        return;
      }

      setUnits(data ?? []);
    } catch (error) {
      console.error(
        'Unexpected unit loading error:',
        error
      );
    } finally {
      setLoadingUnits(false);
    }
  }

  // ----------------------------------------
  // Select PDF
  // ----------------------------------------

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      e.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !==
      'application/pdf'
    ) {
      alert('Please select a PDF file only.');
      e.target.value = '';
      return;
    }

    // 50 MB limit
    const maxSize =
      50 * 1024 * 1024;

    if (selectedFile.size > maxSize) {
      alert(
        'PDF size must be less than 50 MB.'
      );
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
  }

  // ----------------------------------------
  // Upload PDF
  // ----------------------------------------

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!user) {
      alert(
        'You must be logged in to upload a PDF.'
      );
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
      alert('Please enter a PDF title.');
      return;
    }

    if (!file) {
      alert('Please select a PDF file.');
      return;
    }

    setUploading(true);

    let filePath = '';

    try {
      // ----------------------------------------
      // 1. Create unique file path
      // ----------------------------------------

      const safeFileName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      );

      filePath =
        `${subjectId}/${unitId}/${Date.now()}-${safeFileName}`;

      // ----------------------------------------
      // 2. Upload PDF to Storage
      // ----------------------------------------

      const {
        error: uploadError,
      } = await supabase.storage
        .from('pdfs')
        .upload(
          filePath,
          file,
          {
            cacheControl: '3600',
            upsert: false,
          }
        );

      if (uploadError) {
        console.error(
          'Storage upload error:',
          uploadError
        );

        alert(
          `PDF upload failed: ${uploadError.message}`
        );

        return;
      }

      // ----------------------------------------
      // 3. Get public URL
      // ----------------------------------------

      const {
        data: publicUrlData,
      } = supabase.storage
        .from('pdfs')
        .getPublicUrl(filePath);

      const fileUrl =
        publicUrlData.publicUrl;

      // ----------------------------------------
      // 4. Save PDF information
      //    inside materials table
      // ----------------------------------------

   const { error: materialError } = await supabase
  .from('materials')
  .insert({
    unit_id: unitId,
    title: title.trim(),
    material_type: 'pdf',
    file_url: fileUrl,
    uploaded_by: user.id,
  });

      if (materialError) {
        console.error(
          'Material database error:',
          materialError
        );

        // Remove uploaded file if database
        // insert fails
        await supabase.storage
          .from('pdfs')
          .remove([filePath]);

        alert(
          `Could not save PDF information: ${materialError.message}`
        );

        return;
      }

      // ----------------------------------------
      // 5. Success
      // ----------------------------------------

      setUploaded(true);

      setTitle('');
      setSubjectId('');
      setUnitId('');
      setFile(null);
      setUnits([]);

      setTimeout(() => {
        setUploaded(false);
      }, 2500);

    } catch (error) {
      console.error(
        'Unexpected upload error:',
        error
      );

      // Try to clean up uploaded file
      if (filePath) {
        await supabase.storage
          .from('pdfs')
          .remove([filePath]);
      }

      alert(
        'Something went wrong while uploading the PDF.'
      );
    } finally {
      setUploading(false);
    }
  }

  // ----------------------------------------
  // UI
  // ----------------------------------------

  return (
    <>
      <AppHeader
        title="Upload PDF"
        showBack
      />

      <PageContainer showBottomNav>
        <div className="pt-4">

          {uploaded ? (
            // --------------------------------
            // SUCCESS SCREEN
            // --------------------------------
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
                PDF Uploaded!
              </h2>

              <p className="text-sm text-gray-500 text-center">
                The PDF has been successfully
                added to the selected unit.
              </p>
            </motion.div>
          ) : (
            // --------------------------------
            // UPLOAD FORM
            // --------------------------------
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* --------------------------------
                  PDF FILE
              -------------------------------- */}

              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud
                    size={28}
                    className="text-blue-500"
                  />
                </div>

                <p className="text-sm font-medium text-gray-700 mb-1 break-all">
                  {file
                    ? file.name
                    : 'Tap to select a PDF file'}
                </p>

                <p className="text-xs text-gray-400 mb-4">
                  Maximum size: 50 MB
                </p>

                <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 text-sm font-semibold rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                  <FileText size={16} />

                  Choose File

                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={
                      handleFileChange
                    }
                  />
                </label>

                {file && (
                  <p className="text-xs text-gray-400 mt-3">
                    {(
                      file.size /
                      (1024 * 1024)
                    ).toFixed(2)}{' '}
                    MB
                  </p>
                )}
              </motion.div>

              {/* --------------------------------
                  TITLE
              -------------------------------- */}

              <Input
                label="Title"
                placeholder="e.g., Database Design - Complete Notes"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
              />

              {/* --------------------------------
                  SUBJECT
              -------------------------------- */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Subject
                </label>

                <select
                  value={subjectId}
                  onChange={(e) =>
                    setSubjectId(
                      e.target.value
                    )
                  }
                  disabled={
                    loadingSubjects ||
                    uploading
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">
                    {loadingSubjects
                      ? 'Loading subjects...'
                      : 'Select a subject'}
                  </option>

                  {subjects.map(
                    (subject) => (
                      <option
                        key={subject.id}
                        value={subject.id}
                      >
                        {subject.subject_code} —{' '}
                        {subject.subject_name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* --------------------------------
                  UNIT
              -------------------------------- */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Unit
                </label>

                <select
                  value={unitId}
                  onChange={(e) =>
                    setUnitId(
                      e.target.value
                    )
                  }
                  disabled={
                    !subjectId ||
                    loadingUnits ||
                    uploading
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">
                    {!subjectId
                      ? 'Select subject first'
                      : loadingUnits
                      ? 'Loading units...'
                      : units.length === 0
                      ? 'No units available'
                      : 'Select a unit'}
                  </option>

                  {units.map(
                    (unit) => (
                      <option
                        key={unit.id}
                        value={unit.id}
                      >
                        Unit {unit.unit_number}:{' '}
                        {unit.unit_title}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* --------------------------------
                  UPLOAD BUTTON
              -------------------------------- */}

              <Button
                fullWidth
                size="lg"
                type="submit"
                disabled={uploading}
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <UploadCloud
                      size={18}
                      className="animate-pulse"
                    />
                    Uploading...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <UploadCloud
                      size={18}
                    />
                    Upload PDF
                  </span>
                )}
              </Button>

            </form>
          )}

        </div>
      </PageContainer>

      <TeacherBottomNav />
    </>
  );
}
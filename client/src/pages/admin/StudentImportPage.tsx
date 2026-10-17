import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Users,
  Search,
  GraduationCap,
  Edit3,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { studentApi } from '@/api';

interface StudentItem {
  _id: string;
  user?: {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
  };
  name?: string;
  rollNumber: string;
  branch: string;
  graduationYear: number;
  cgpa: number;
  activeBacklogs: number;
  phone?: string;
  tenthPercentage?: number;
  twelfthPercentage?: number;
  academicDataVerified?: boolean;
  isPlaced?: boolean;
  placedCompany?: string;
}

interface PreviewRow {
  rowNumber: number;
  data: {
    name: string;
    email: string;
    rollNumber: string;
    branch: string;
    graduationYear: number;
    cgpa: number;
    activeBacklogs: number;
  };
  isValid: boolean;
  errors: string[];
  isDuplicate?: boolean;
}

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateCount: number;
  previewRows: PreviewRow[];
  cacheKey?: string;
}

interface CommitSummary {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
}

export default function StudentImportPage() {
  const [activeTab, setActiveTab] = useState<'roster' | 'import'>('roster');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');

  // CSV Import State
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [commitResult, setCommitResult] = useState<CommitSummary | null>(null);

  // Edit Student Modal State (Placement Coordinator / Admin Power)
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    rollNumber: '',
    branch: '',
    graduationYear: 2025,
    cgpa: 0,
    activeBacklogs: 0,
    phone: '',
    tenthPercentage: '',
    twelfthPercentage: '',
    isActive: true,
    isPlaced: false,
    placedCompany: '',
  });

  const handleOpenEdit = (s: StudentItem) => {
    setEditingStudent(s);
    const fullName = s.name || `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim();
    setEditForm({
      name: fullName,
      email: s.user?.email || '',
      rollNumber: s.rollNumber || '',
      branch: s.branch || '',
      graduationYear: s.graduationYear || 2025,
      cgpa: s.cgpa ?? 0,
      activeBacklogs: s.activeBacklogs ?? 0,
      phone: s.phone || '',
      tenthPercentage: s.tenthPercentage !== undefined && s.tenthPercentage !== null ? String(s.tenthPercentage) : '',
      twelfthPercentage: s.twelfthPercentage !== undefined && s.twelfthPercentage !== null ? String(s.twelfthPercentage) : '',
      isActive: s.user?.isActive !== false,
      isPlaced: !!s.isPlaced,
      placedCompany: s.placedCompany || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      setSavingEdit(true);
      const payload: any = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        rollNumber: editForm.rollNumber.trim().toUpperCase(),
        branch: editForm.branch.trim(),
        graduationYear: Number(editForm.graduationYear),
        cgpa: Number(editForm.cgpa),
        activeBacklogs: Number(editForm.activeBacklogs),
        phone: editForm.phone.trim() || undefined,
        tenthPercentage: editForm.tenthPercentage ? Number(editForm.tenthPercentage) : undefined,
        twelfthPercentage: editForm.twelfthPercentage ? Number(editForm.twelfthPercentage) : undefined,
        isActive: editForm.isActive,
        isPlaced: editForm.isPlaced,
        placedCompany: editForm.placedCompany?.trim() || undefined,
      };

      await studentApi.updateStudent(editingStudent._id, payload);
      toast.success('Student details updated successfully!');
      setEditingStudent(null);
      fetchStudentRoster();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update student details';
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const sampleCsvContent = `name,email,rollNumber,branch,graduationYear,cgpa,activeBacklogs
Aarav Sharma,aarav@college.edu,21CS101,CSE,2025,8.85,0
Diya Patel,diya@college.edu,21EC102,ECE,2025,7.90,0
Rohan Verma,rohan@college.edu,21ME103,MECH,2025,6.50,1
Ananya Iyer,ananya@college.edu,21IT104,IT,2025,9.20,0`;

  useEffect(() => {
    fetchStudentRoster();
  }, []);

  const fetchStudentRoster = async () => {
    try {
      setLoadingStudents(true);
      const res = await studentApi.listStudents();
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : res.data?.data?.students || res.data?.data?.items || [];
      setStudents(list);
    } catch (err) {
      console.error('Failed to fetch student directory:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_student_roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith('.csv')) {
        toast.error('Please upload a valid .csv file');
        return;
      }
      setFile(selected);
      setSummary(null);
      setCommitResult(null);
    }
  };

  const handlePreviewUpload = async () => {
    if (!file) {
      toast.error('Select a CSV file first');
      return;
    }

    try {
      setPreviewing(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await studentApi.uploadCsvPreview(formData);
      const data = res.data?.data;
      if (data) {
        const previewRows: PreviewRow[] = data.previewRows || [
          ...(data.valid || []).map((v: any) => ({
            rowNumber: v.row,
            data: v.data,
            isValid: true,
            errors: [],
            isDuplicate: false,
          })),
          ...(data.duplicates || []).map((d: any) => ({
            rowNumber: d.row,
            data: d.data,
            isValid: true,
            errors: d.reasons || ['Duplicate'],
            isDuplicate: true,
          })),
          ...(data.invalid || []).map((inv: any) => ({
            rowNumber: inv.row,
            data: inv.data,
            isValid: false,
            errors: inv.errors || ['Invalid row'],
            isDuplicate: false,
          })),
        ].sort((a: any, b: any) => a.rowNumber - b.rowNumber);

        const total = data.totalRows ?? data.summary?.total ?? previewRows.length;
        const validCount = data.validRows ?? data.summary?.valid ?? (data.valid?.length || 0);
        const invalidCount = data.invalidRows ?? data.summary?.invalid ?? (data.invalid?.length || 0);
        const dupCount = data.duplicateCount ?? data.summary?.duplicates ?? (data.duplicates?.length || 0);

        setSummary({
          totalRows: total,
          validRows: validCount,
          invalidRows: invalidCount,
          duplicateCount: dupCount,
          previewRows,
          cacheKey: data.batchId || data.cacheKey,
        });

        toast.success(`Validated ${total} rows from CSV`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'CSV validation failed';
      toast.error(msg);
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirmCommit = async () => {
    if (!summary) return;

    try {
      setCommitting(true);
      const res = await studentApi.commitCsvImport({
        batchId: summary.cacheKey,
        cacheKey: summary.cacheKey,
        includeUpdates: true,
        records: summary.previewRows?.filter((r) => r.isValid).map((r) => r.data) || [],
      });

      const resData = res.data?.data;
      if (resData) {
        const resultSummary: CommitSummary = {
          createdCount: resData.createdCount ?? resData.summary?.createdCount ?? resData.summary?.created ?? 0,
          updatedCount: resData.updatedCount ?? resData.summary?.updatedCount ?? resData.summary?.updated ?? 0,
          skippedCount: resData.skippedCount ?? resData.summary?.skippedCount ?? 0,
          failedCount: resData.failedCount ?? resData.summary?.failedCount ?? resData.summary?.failed ?? 0,
        };
        setCommitResult(resultSummary);
        toast.success('Student roster imported successfully!');
        fetchStudentRoster();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to commit student import';
      toast.error(msg);
    } finally {
      setCommitting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSummary(null);
    setCommitResult(null);
  };

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const term = studentSearch.toLowerCase();
    const fullName = s.name || `${s.user?.firstName || ''} ${s.user?.lastName || ''}`;
    return (
      fullName.toLowerCase().includes(term) ||
      s.rollNumber?.toLowerCase().includes(term) ||
      s.branch?.toLowerCase().includes(term) ||
      s.user?.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Header with Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Student Cohort & Onboarding
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Manage enrolled students, inspect verified academic credentials, and batch-import new cohorts.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Enrolled Students ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'import'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            CSV Import
          </button>
        </div>
      </div>

      {/* TAB 1: ENROLLED STUDENT ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search students by name, roll number, email, or branch..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => setActiveTab('import')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0"
            >
              <Upload className="w-4 h-4" />
              Import CSV Roster
            </button>
          </div>

          {loadingStudents ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-900/50 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No students found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No verified student records match your query. Use CSV import to onboard a student cohort.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Grad Year</th>
                      <th className="py-3 px-4">CGPA</th>
                      <th className="py-3 px-4">Active Backlogs</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredStudents.map((s) => {
                      const name = s.name || `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim() || 'Student';
                      return (
                        <tr key={s._id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-xs text-indigo-400">
                                {name.substring(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-white">{name}</p>
                                <span className="text-[11px] text-slate-400">{s.user?.email || '—'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-indigo-300">
                            {s.rollNumber}
                          </td>
                          <td className="py-3 px-4">{s.branch}</td>
                          <td className="py-3 px-4 font-semibold text-white">{s.graduationYear}</td>
                          <td className="py-3 px-4 font-bold text-emerald-400">{s.cgpa}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.activeBacklogs > 0
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {s.activeBacklogs}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-all hover:scale-105"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CSV IMPORT & ONBOARDING */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Upload Verified Student CSV</h2>
            <button
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold transition-all shrink-0"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              Download Sample CSV
            </button>
          </div>

          {!summary && !commitResult && (
            <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-10 text-center transition-colors">
                <FileSpreadsheet className="w-14 h-14 text-indigo-400 mx-auto mb-4" />
                <h3 className="text-base font-bold text-white">Select College Roster (.csv)</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Required headers: <code className="text-indigo-300">name, email, rollNumber, branch, graduationYear, cgpa, activeBacklogs</code>
                </p>

                <div className="mt-6 flex flex-col items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    id="csvFileInput"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="csvFileInput"
                    className="cursor-pointer px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
                  >
                    {file ? file.name : 'Choose CSV File'}
                  </label>

                  {file && (
                    <span className="text-xs text-slate-400">
                      Selected: <span className="text-white font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-500">
                  * Plaintext passwords are never generated or stored in CSV. Students receive secure account activation links.
                </div>

                <button
                  onClick={handlePreviewUpload}
                  disabled={!file || previewing}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg transition-all"
                >
                  <Upload className="w-4 h-4" />
                  {previewing ? 'Validating CSV...' : 'Upload & Validate'}
                </button>
              </div>
            </div>
          )}

          {summary && !commitResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Rows</span>
                  <p className="text-2xl font-black text-white mt-1">{summary.totalRows}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30">
                  <span className="text-xs text-emerald-400 font-semibold uppercase">Valid Rows</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{summary.validRows}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/30">
                  <span className="text-xs text-rose-400 font-semibold uppercase">Invalid Rows</span>
                  <p className="text-2xl font-black text-rose-400 mt-1">{summary.invalidRows}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30">
                  <span className="text-xs text-amber-400 font-semibold uppercase">Duplicates</span>
                  <p className="text-2xl font-black text-amber-400 mt-1">{summary.duplicateCount || 0}</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Validation Pre-Commit Inspection</h3>
                    <p className="text-xs text-slate-400">
                      Review row validity and duplicate flags before committing to the live database.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Discard & Re-upload
                    </button>
                    <button
                      onClick={handleConfirmCommit}
                      disabled={summary.validRows === 0 || committing}
                      className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {committing ? 'Committing...' : `Confirm Import (${summary.validRows} Records)`}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Row</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Roll No</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Grad Year</th>
                        <th className="py-3 px-4">CGPA</th>
                        <th className="py-3 px-4">Backlogs</th>
                        <th className="py-3 px-4">Errors / Warnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {summary.previewRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={row.isValid ? 'hover:bg-slate-800/30' : 'bg-rose-950/20 hover:bg-rose-950/30'}
                        >
                          <td className="py-2.5 px-4 font-mono">{row.rowNumber}</td>
                          <td className="py-2.5 px-4">
                            {row.isValid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Valid
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Invalid
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-white">{row.data.name}</td>
                          <td className="py-2.5 px-4">{row.data.email}</td>
                          <td className="py-2.5 px-4 font-mono">{row.data.rollNumber}</td>
                          <td className="py-2.5 px-4">{row.data.branch}</td>
                          <td className="py-2.5 px-4">{row.data.graduationYear}</td>
                          <td className="py-2.5 px-4 font-bold text-indigo-300">{row.data.cgpa}</td>
                          <td className="py-2.5 px-4">{row.data.activeBacklogs}</td>
                          <td className="py-2.5 px-4 text-rose-400">
                            {row.errors?.length ? row.errors.join(', ') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {commitResult && (
            <div className="p-8 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Import Committed Successfully!</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Verified student records are stored in the database. Activation links are ready for student onboarding.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto text-left">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400">Created New</span>
                  <p className="text-xl font-black text-emerald-400 mt-1">{commitResult.createdCount}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400">Updated Existing</span>
                  <p className="text-xl font-black text-indigo-400 mt-1">{commitResult.updatedCount}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400">Skipped (Duplicate)</span>
                  <p className="text-xl font-black text-amber-400 mt-1">{commitResult.skippedCount}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400">Failed</span>
                  <p className="text-xl font-black text-rose-400 mt-1">{commitResult.failedCount || 0}</p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setActiveTab('roster')}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all"
                >
                  View Enrolled Roster
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                >
                  Import Another Cohort
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Student Details Modal (Placement Coordinator Power) */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                  Edit Student Details
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update credentials, verified academic criteria, and account status as Placement Coordinator.
                </p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.rollNumber}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, rollNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Branch / Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.branch}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, branch: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Graduation Year (Batch) *
                  </label>
                  <input
                    type="number"
                    required
                    min={2000}
                    max={2040}
                    value={editForm.graduationYear}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, graduationYear: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    CGPA (0.0 - 10.0) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    value={editForm.cgpa}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, cgpa: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Active Backlogs Count *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.activeBacklogs}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, activeBacklogs: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    10th Percentage (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editForm.tenthPercentage}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, tenthPercentage: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    12th Percentage (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editForm.twelfthPercentage}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, twelfthPercentage: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Status Controls */}
              <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={editForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, isActive: e.target.value === 'active' }))
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active (Default)</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Placement Status
                  </label>
                  <select
                    value={editForm.isPlaced ? 'placed' : 'unplaced'}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, isPlaced: e.target.value === 'placed' }))
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="unplaced">Unplaced</option>
                    <option value="placed">Placed (Has Offer)</option>
                  </select>
                </div>

                {editForm.isPlaced && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Placed Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Google, Microsoft, Infosys"
                      value={editForm.placedCompany}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, placedCompany: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition"
                >
                  {savingEdit ? 'Saving Changes...' : 'Save Student Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

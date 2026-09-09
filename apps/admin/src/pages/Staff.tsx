import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Input,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Users,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  UserPlus,
  Sparkles,
  Award,
  Clock,
  Phone,
  Mail,
  ExternalLink,
  Plus,
} from '@culinaryos/ui';
import { apiHeaders, getApiBase } from '@culinaryos/shared';

const API = getApiBase();

interface StaffRow {
  user_id?: string;
  display_name: string;
  role: string;
  active?: boolean;
  has_pin?: boolean;
}

interface JobPosting {
  id: string;
  title: string;
  department: 'BOH' | 'FOH' | 'Management' | 'Bar';
  role: string;
  pay_range: string;
  shift_type: string;
  experience_level: string;
  status: string;
  applicant_count: number;
}

interface JobApplication {
  id: string;
  job_id: string;
  job_title: string;
  department: string;
  candidate_name: string;
  email: string;
  phone: string;
  years_experience: number;
  certifications: string[];
  availability: string;
  cover_notes?: string;
  stage: 'applied' | 'review' | 'interview' | 'staging_trial' | 'offer' | 'hired' | 'rejected';
  applied_at: string;
  hired_at?: string;
  staff_pin_issued?: string;
}

export function StaffPage() {
  const [activeTab, setActiveTab] = useState<'staff' | 'ats' | 'postings'>('staff');
  
  // Staff Directory state
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    display_name: '',
    role: 'server',
    pin: '',
  });

  // Talent ATS state
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [hiredSuccessModal, setHiredSuccessModal] = useState<{
    candidate: string;
    role: string;
    pin: string;
  } | null>(null);

  // Staff Edit Drawer state
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
  const [editForm, setEditForm] = useState({ display_name: '', role: 'server', pin: '', active: true });
  const [updatingStaff, setUpdatingStaff] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  // New Job Requisition state
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDept, setNewJobDept] = useState<'BOH' | 'FOH' | 'Bar' | 'Management'>('BOH');
  const [newJobRole, setNewJobRole] = useState<'cook' | 'server' | 'bartender' | 'dishwasher' | 'manager'>('cook');
  const [newJobPay, setNewJobPay] = useState('$20.00 - $24.00 / hr');
  const [newJobShift, setNewJobShift] = useState<'Full-Time' | 'Part-Time' | 'Seasonal' | 'Flexible'>('Full-Time');
  const [newJobDesc, setNewJobDesc] = useState('');

  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = apiHeaders();
      const [staffRes, talentRes, jobsRes] = await Promise.all([
        fetch(`${API}/v1/admin/staff`, { headers }).then((r) => r.json()).catch(() => ({ ok: false })),
        fetch(`${API}/v1/talent/applications`, { headers }).then((r) => r.json()).catch(() => ({ ok: false })),
        fetch(`${API}/v1/talent/jobs`, { headers }).then((r) => r.json()).catch(() => ({ ok: false })),
      ]);

      if (staffRes.ok) {
        setStaff(staffRes.data?.staff ?? []);
      }
      if (talentRes.ok) {
        setApplications(talentRes.data?.applications ?? []);
      }
      if (jobsRes.ok) {
        setJobs(jobsRes.data?.jobs ?? []);
      }
    } catch {
      setMsg({ text: 'Failed to connect to API server', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/v1/admin/staff`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!body.ok) {
        setMsg({ text: body.error?.message ?? 'Staff creation failed', type: 'error' });
        return;
      }
      setMsg({
        text: `Successfully provisioned staff member: ${body.data?.display_name ?? form.display_name}`,
        type: 'success',
      });
      setForm({ email: '', display_name: '', role: 'server', pin: '' });
      setShowAddStaffModal(false);
      void load();
    } catch {
      setMsg({ text: 'Network error while creating staff member', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff?.user_id) return;
    setUpdatingStaff(true);
    try {
      const payload: any = {
        display_name: editForm.display_name,
        role: editForm.role,
        active: editForm.active,
      };
      if (editForm.pin.trim()) {
        payload.pin = editForm.pin.trim();
      }

      const res = await fetch(`${API}/v1/admin/staff/${editingStaff.user_id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!body.ok) {
        setMsg({ text: body.error?.message ?? 'Staff update failed', type: 'error' });
        return;
      }
      setMsg({ text: `Updated staff profile for ${editForm.display_name}`, type: 'success' });
      setEditingStaff(null);
      void load();
    } catch {
      setMsg({ text: 'Network error while updating staff profile', type: 'error' });
    } finally {
      setUpdatingStaff(false);
    }
  }

  async function handleStageChange(appId: string, newStage: string) {
    try {
      const res = await fetch(`${API}/v1/talent/applications/${appId}/stage`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, stage: newStage as any } : a))
        );
        setMsg({ text: `Candidate advanced to ${newStage.toUpperCase().replace('_', ' ')}`, type: 'success' });
      }
    } catch {
      setMsg({ text: 'Failed to update candidate stage', type: 'error' });
    }
  }

  async function handle1ClickHire(app: JobApplication) {
    try {
      const res = await fetch(`${API}/v1/talent/applications/${app.id}/hire`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      const body = await res.json();
      if (body.ok && body.data?.onboarding) {
        const ob = body.data.onboarding;
        setHiredSuccessModal({
          candidate: ob.display_name,
          role: ob.role,
          pin: ob.pos_pin,
        });
        // Also auto-add to local staff list
        setStaff((prev) => [
          ...prev,
          {
            user_id: ob.staff_id,
            display_name: ob.display_name,
            role: ob.role,
            active: true,
            has_pin: true,
          },
        ]);
        setApplications((prev) =>
          prev.map((a) => (a.id === app.id ? { ...a, stage: 'hired', staff_pin_issued: ob.pos_pin } : a))
        );
      }
    } catch {
      setMsg({ text: 'Network error during 1-click hire onboarding', type: 'error' });
    }
  }

  async function handleCreateJobRequisition(e: React.FormEvent) {
    e.preventDefault();
    if (!newJobTitle.trim()) return;

    try {
      const res = await fetch(`${API}/v1/talent/jobs`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          title: newJobTitle,
          department: newJobDept,
          role: newJobRole,
          pay_range: newJobPay,
          shift_type: newJobShift,
          description: newJobDesc,
        }),
      });
      if (res.ok) {
        setMsg({ text: `Published job posting: "${newJobTitle}" to CulinaryJobs`, type: 'success' });
        setShowNewJobModal(false);
        setNewJobTitle('');
        setNewJobDesc('');
        void load();
      }
    } catch {
      setMsg({ text: 'Failed to create job posting', type: 'error' });
    }
  }

  const activeStaffCount = staff.filter((s) => s.active !== false).length;
  const pinConfiguredCount = staff.filter((s) => s.has_pin !== false).length;
  const filteredApps = selectedStageFilter === 'all'
    ? applications
    : applications.filter((a) => a.stage === selectedStageFilter);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-foreground uppercase tracking-wider">
            Staff & Talent Ecosystem
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Manage restaurant personnel, POS terminal PIN credentials, and CulinaryJobs applicant hiring pipeline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Navigation Tabs */}
          <div className="bg-muted p-1 rounded-xl flex items-center gap-1 border border-border">
            <Button
              onClick={() => setActiveTab('staff')}
              variant="ghost"
              size="sm"
              className={activeTab === 'staff' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}
            >
              <Users className="w-3.5 h-3.5" />
              Staff & PINs ({staff.length})
            </Button>
            <Button
              onClick={() => setActiveTab('ats')}
              variant="ghost"
              size="sm"
              className={activeTab === 'ats' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-500" />
              Hiring ATS ({applications.length})
            </Button>
            <Button
              onClick={() => setActiveTab('postings')}
              variant="ghost"
              size="sm"
              className={activeTab === 'postings' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              Job Postings ({jobs.length})
            </Button>
          </div>

          <a
            href="http://localhost:5176/jobs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            Public Job Board
          </a>

          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Feedback Toast */}
      {msg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold animate-fadeIn ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
            <span>{msg.text}</span>
          </div>
          <Button
            variant="link"
            className="h-auto px-0 py-0 text-inherit opacity-80 hover:opacity-100"
            onClick={() => setMsg(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {/* Full Width Staff Directory */}
          <div className="w-full">
            <Card className="p-5">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div>
                  <CardTitle>Team Members Directory</CardTitle>
                  <CardDescription>Personnel with POS and KDS terminal authorizations</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {activeStaffCount} Active Accounts · {pinConfiguredCount} PIN Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(true)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Staff</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground font-medium flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <span>Loading staff records…</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Badge #</TableHead>
                      <TableHead>Role Level</TableHead>
                      <TableHead>Terminal PIN</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((s, i) => (
                      <TableRow
                        key={s.user_id ?? i}
                        onClick={() => {
                          setEditingStaff(s);
                          setEditForm({
                            display_name: s.display_name,
                            role: s.role,
                            pin: '',
                            active: s.active !== false,
                          });
                        }}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>
                          <div className="font-black text-foreground text-sm flex items-center gap-2">
                            <span>{s.display_name}</span>
                            <span className="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                              (Click to Edit)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono font-black bg-secondary px-2 py-1 rounded border border-border">
                            #{101 + i}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="brand">{(s.role ?? 'staff').toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.has_pin !== false ? 'success' : 'warning'}>
                            {s.has_pin !== false ? 'PIN ACTIVE' : 'NO PIN'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={s.active !== false ? 'secondary' : 'destructive'}>
                            {s.active !== false ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!staff.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                          No staff found. Use + Add Staff to add team members.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: CULINARYJOBS APPLICANT TRACKING (ATS) */}
      {activeTab === 'ats' && (
        <div className="space-y-4">
          {/* Pipeline Stage Selector Chips */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            {[
              { id: 'all', label: 'All Candidates', count: applications.length },
              { id: 'applied', label: 'Applied', count: applications.filter(a => a.stage === 'applied').length },
              { id: 'review', label: 'In Review', count: applications.filter(a => a.stage === 'review').length },
              { id: 'interview', label: 'Interview Scheduled', count: applications.filter(a => a.stage === 'interview').length },
              { id: 'staging_trial', label: 'Kitchen Staging / Trial', count: applications.filter(a => a.stage === 'staging_trial').length },
              { id: 'offer', label: 'Offer Extended', count: applications.filter(a => a.stage === 'offer').length },
              { id: 'hired', label: 'Hired & Onboarded', count: applications.filter(a => a.stage === 'hired').length },
            ].map((st) => (
              <Button
                key={st.id}
                onClick={() => setSelectedStageFilter(st.id)}
                variant={selectedStageFilter === st.id ? 'default' : 'secondary'}
                size="sm"
                className="rounded-xl"
              >
                {st.label} ({st.count})
              </Button>
            ))}
          </div>

          {/* Candidates Pipeline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredApps.map((app) => (
              <Card key={app.id} className="p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {app.department} · {app.years_experience} Yrs Exp
                      </span>
                      <h3 className="font-bold text-foreground text-base mt-1">{app.candidate_name}</h3>
                      <p className="text-xs font-semibold text-primary">{app.job_title}</p>
                    </div>
                    <Badge variant={app.stage === 'hired' ? 'success' : 'brand'} className="capitalize">
                      {app.stage.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Contact info */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> {app.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {app.phone}
                    </span>
                  </div>

                  {/* Certifications & Availability */}
                  <div className="text-xs space-y-1 bg-muted/40 p-2.5 rounded-lg border border-border/50">
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Availability:</strong> {app.availability}
                    </p>
                    {app.certifications.length > 0 && (
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Certifications:</strong> {app.certifications.join(', ')}
                      </p>
                    )}
                    {app.cover_notes && (
                      <p className="text-muted-foreground text-[11px] italic mt-1">
                        "{app.cover_notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* ATS Action Controls */}
                <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
                  {/* Advance Stage Selector */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground font-semibold text-[11px]">Stage:</span>
                    <select
                      value={app.stage}
                      onChange={(e) => handleStageChange(app.id, e.target.value)}
                      className="bg-background border border-input rounded-md px-2 py-1 text-xs font-bold text-foreground capitalize"
                    >
                      <option value="applied">Applied</option>
                      <option value="review">Review</option>
                      <option value="interview">Interview</option>
                      <option value="staging_trial">Kitchen Trial</option>
                      <option value="offer">Offer Extended</option>
                      <option value="hired">Hired</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  {/* 1-Click Hire & Onboard Button */}
                  {app.stage !== 'hired' ? (
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => handle1ClickHire(app)}
                      className="uppercase font-bold tracking-wider text-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                      Hire & Issue POS PIN
                    </Button>
                  ) : (
                    <Badge variant="success" className="font-mono text-xs px-2.5 py-1">
                      PIN: {app.staff_pin_issued || 'ACTIVE'}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
            {filteredApps.length === 0 && (
              <div className="col-span-2 py-12 text-center text-xs text-muted-foreground">
                No candidates currently in this stage.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: JOB REQUISITIONS & POSTINGS MANAGER */}
      {activeTab === 'postings' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Active Job Requisitions ({jobs.length})
            </h3>
            <Button
              variant="brand"
              size="sm"
              onClick={() => setShowNewJobModal(true)}
              className="uppercase font-bold tracking-wider text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Job Posting
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((j) => (
              <Card key={j.id} className="p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="brand">{j.department}</Badge>
                    <span className="text-[11px] font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
                      {j.applicant_count ?? 0} Applicants
                    </span>
                  </div>
                  <h4 className="font-bold text-foreground text-sm leading-snug">{j.title}</h4>
                  <p className="text-xs font-mono font-bold text-emerald-600">{j.pay_range}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Shift: {j.shift_type} · Experience: {j.experience_level}
                  </p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <Badge variant={j.status === 'active' ? 'success' : 'secondary'}>
                    {j.status.toUpperCase()}
                  </Badge>
                  <a
                    href="http://localhost:5176/jobs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>View Live</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 1-Click Hired Congratulatory Modal */}
      {hiredSuccessModal && (
        <div
          onClick={() => setHiredSuccessModal(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full bg-card rounded-2xl shadow-2xl p-6 space-y-4 border border-border text-center animate-fadeIn"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-foreground uppercase tracking-wider">
              Staff Member Hired & Onboarded!
            </h3>

            <p className="text-xs text-muted-foreground">
              Candidate <strong className="text-foreground">{hiredSuccessModal.candidate}</strong> has been provisioned as a <strong className="text-foreground capitalize">{hiredSuccessModal.role}</strong>.
            </p>

            <div className="bg-muted p-4 rounded-xl border border-border space-y-2 text-left">
              <p className="text-xs font-bold text-foreground">Employee POS Onboarding Slip:</p>
              <div className="flex justify-between items-center bg-background p-2.5 rounded-lg border border-border">
                <span className="text-xs text-muted-foreground font-medium">Terminal Security PIN:</span>
                <span className="text-base font-mono font-black text-primary tracking-widest">
                  {hiredSuccessModal.pin}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Employee can immediately enter PIN <code className="font-bold text-foreground">{hiredSuccessModal.pin}</code> at any POS terminal (:5172) or mobile server handheld.
              </p>
            </div>

            <Button
              variant="brand"
              size="touch"
              className="w-full uppercase tracking-wider font-bold text-xs"
              onClick={() => setHiredSuccessModal(null)}
            >
              Done & Return to Staff Roster
            </Button>
          </div>
        </div>
      )}

      {/* Create New Job Requisition Modal */}
      {showNewJobModal && (
        <div
          onClick={() => setShowNewJobModal(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-lg w-full bg-card rounded-2xl shadow-2xl p-6 space-y-4 border border-border text-left animate-fadeIn max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Create Job Requisition (CulinaryJobs)</h3>
              <Button
                onClick={() => setShowNewJobModal(false)}
                variant="ghost"
                className="h-auto w-auto p-1 text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateJobRequisition} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="jtitle">Job Title *</Label>
                <Input
                  id="jtitle"
                  required
                  placeholder="e.g. Sous Chef / Lead Line Cook"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="jdept">Department</Label>
                  <select
                    id="jdept"
                    value={newJobDept}
                    onChange={(e) => setNewJobDept(e.target.value as any)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground font-bold"
                  >
                    <option value="BOH">Kitchen (BOH)</option>
                    <option value="FOH">Front of House (FOH)</option>
                    <option value="Bar">Bar & Cocktails</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="jrole">Role</Label>
                  <select
                    id="jrole"
                    value={newJobRole}
                    onChange={(e) => setNewJobRole(e.target.value as any)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground font-bold capitalize"
                  >
                    <option value="cook">Line Cook / Chef</option>
                    <option value="server">Dining Server</option>
                    <option value="bartender">Bartender</option>
                    <option value="dishwasher">Dishwasher / Prep</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="jpay">Pay Range *</Label>
                  <Input
                    id="jpay"
                    required
                    placeholder="e.g. $22.00 - $26.00 / hr"
                    value={newJobPay}
                    onChange={(e) => setNewJobPay(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="jshift">Shift Type</Label>
                  <select
                    id="jshift"
                    value={newJobShift}
                    onChange={(e) => setNewJobShift(e.target.value as any)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground font-bold"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Seasonal">Seasonal</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="jdesc">Job Description & Responsibilities</Label>
                <textarea
                  id="jdesc"
                  rows={3}
                  placeholder="Outline key culinary skills, shift responsibilities, and station duties..."
                  value={newJobDesc}
                  onChange={(e) => setNewJobDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewJobModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="brand" size="sm" className="font-bold">
                  Publish to Job Board
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Staff Edit Slide-over Drawer */}
      {editingStaff && (
        <div
          onClick={() => setEditingStaff(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card border-l-2 border-border h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                    Staff Profile Editor
                  </span>
                  <h2 className="text-xl font-black text-foreground">{editingStaff.display_name}</h2>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {editingStaff.user_id}</p>
                </div>
                <button
                  onClick={() => setEditingStaff(null)}
                  className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <form id="edit-staff-form" onSubmit={handleUpdateStaff} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="editName">Display Name</Label>
                  <Input
                    id="editName"
                    type="text"
                    value={editForm.display_name}
                    onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editRole">Assigned Role</Label>
                  <select
                    id="editRole"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs text-foreground font-bold capitalize"
                  >
                    <option value="server">Server (FOH Dining & POS)</option>
                    <option value="cook">Cook / Chef (Kitchen KDS Line)</option>
                    <option value="bartender">Bartender (Bar Tab Hub)</option>
                    <option value="dishwasher">Dishwasher / Prep Staff</option>
                    <option value="manager">Manager (Admin, Voids & Comps)</option>
                    <option value="owner">Owner (Full Permissions)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editPin">Reset Terminal PIN (leave blank to keep current)</Label>
                  <Input
                    id="editPin"
                    type="password"
                    inputMode="numeric"
                    placeholder="Enter new 4–8 digit PIN"
                    value={editForm.pin}
                    onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })}
                    className="font-mono text-center tracking-widest text-base"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    PIN enables instant touchscreen login on POS, Bar Tabs, and KDS.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label>Employment Status</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, active: true })}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all ${
                        editForm.active
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, active: false })}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all ${
                        !editForm.active
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      Inactive
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex gap-2 pt-4 border-t border-border mt-6">
              <Button
                type="button"
                variant="outline"
                size="touch"
                onClick={() => setEditingStaff(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-staff-form"
                variant="brand"
                size="touch"
                disabled={updatingStaff}
                className="flex-1 font-bold"
              >
                {updatingStaff ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div
          onClick={() => setShowAddStaffModal(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full bg-card rounded-2xl shadow-2xl p-6 space-y-4 border border-border text-left"
          >
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground uppercase">Add Staff Member</h3>
              <button onClick={() => setShowAddStaffModal(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="modalEmail">Email Address</Label>
                <Input
                  id="modalEmail"
                  type="email"
                  placeholder="employee@restaurant.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modalName">Display Name</Label>
                <Input
                  id="modalName"
                  type="text"
                  placeholder="e.g. Alex Server"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modalRole">Assigned Role</Label>
                <select
                  id="modalRole"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs text-foreground font-bold capitalize"
                >
                  <option value="server">Server (POS Terminal)</option>
                  <option value="cook">Cook / Chef (Kitchen KDS)</option>
                  <option value="bartender">Bartender (Bar Tab Hub)</option>
                  <option value="dishwasher">Dishwasher / Prep</option>
                  <option value="manager">Manager (Admin & Voids)</option>
                  <option value="owner">Owner (Full Permissions)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modalPin">Terminal PIN (4–8 digits)</Label>
                <Input
                  id="modalPin"
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  pattern="\d{4,8}"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  required
                  className="font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="touch" onClick={() => setShowAddStaffModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="brand" size="touch" disabled={submitting} className="flex-1 font-bold">
                  {submitting ? 'Provisioning…' : 'Provision Staff'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffPage;

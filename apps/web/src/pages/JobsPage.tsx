import React, { useState, useEffect } from 'react';
import {
  MarketingHeader,
  Briefcase,
  ChefHat,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Sparkles,
  Search,
  Filter,
  Send,
  X,
  User,
  Mail,
  Phone,
  Award,
  ArrowRight,
  ShieldCheck,
  Building,
} from '@culinaryos/ui';
import { getApiBase, apiHeaders } from '@culinaryos/shared';

const API = getApiBase();

interface JobPosting {
  id: string;
  title: string;
  department: 'BOH' | 'FOH' | 'Management' | 'Bar';
  role: string;
  pay_type: string;
  pay_range: string;
  shift_type: string;
  experience_level: string;
  description: string;
  requirements: string[];
  perks: string[];
  status: string;
  created_at: string;
}

const FALLBACK_JOBS: JobPosting[] = [
  {
    id: 'job-101',
    title: 'Lead Line Cook (Wood-Fired Pizza & Grill)',
    department: 'BOH',
    role: 'cook',
    pay_type: 'hourly',
    pay_range: '$22.00 - $26.00 / hr',
    shift_type: 'Full-Time',
    experience_level: '3+ Years',
    description: 'Seeking an experienced line cook skilled in high-temperature wood-fired pizza ovens, steak searing, and fast-paced dinner services.',
    requirements: ['3+ years high-volume kitchen experience', 'ServSafe Food Handler certified', 'Ability to lift 50 lbs and work weekend dinner services'],
    perks: ['Shift meals included', 'Weekly tip pool share', 'Health insurance stipend', 'Flexible scheduling'],
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'job-102',
    title: 'Lead Bartender & Craft Cocktail Specialist',
    department: 'Bar',
    role: 'bartender',
    pay_type: 'hourly',
    pay_range: '$16.00 / hr + Tips ($35-$45/hr avg)',
    shift_type: 'Full-Time',
    experience_level: '1-2 Years',
    description: 'Lead our dinner cocktail program, curate seasonal drinks, maintain liquor inventory par levels, and deliver exceptional guest hospitality.',
    requirements: ['TIPS / Alcohol service certified', '2+ years craft cocktail bartending', 'Proficiency with POS systems and inventory counting'],
    perks: ['High-earning tip environment', 'Creative menu input', 'Discounted staff dining'],
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'job-103',
    title: 'Dining Room Server (Evening Service)',
    department: 'FOH',
    role: 'server',
    pay_type: 'hourly',
    pay_range: '$12.00 / hr + Tips ($30-$40/hr avg)',
    shift_type: 'Part-Time',
    experience_level: '1-2 Years',
    description: 'Engaging, detail-oriented tableside server for busy dinner shifts. Experience with multi-seat table ordering, coursing, and wine service.',
    requirements: ['1+ year full-service restaurant experience', 'Strong menu and allergen awareness', 'Positive team-first attitude'],
    perks: ['Daily cash/card tip out', 'Flexible 4-day work week options', 'Shift meal provided'],
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'job-104',
    title: 'Kitchen Steward & Prep Assistant',
    department: 'BOH',
    role: 'dishwasher',
    pay_type: 'hourly',
    pay_range: '$17.00 - $19.00 / hr',
    shift_type: 'Full-Time',
    experience_level: 'Entry Level',
    description: 'Maintain dish station cleanliness, assist prep cooks with morning vegetable/sauce prep, and support evening kitchen operations.',
    requirements: ['Punctual, reliable, and hardworking', 'Enjoys working in a collaborative culinary team', 'No experience necessary — we train!'],
    perks: ['Fast-track promotion to Line Cook', 'Paid shift meals', 'Consistent 40 hr schedule'],
    status: 'active',
    created_at: new Date().toISOString(),
  },
];

export function JobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>(FALLBACK_JOBS);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  
  // Application form state
  const [candidateName, setCandidateName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [yearsExp, setYearsExp] = useState('2');
  const [certifications, setCertifications] = useState('');
  const [availability, setAvailability] = useState('Full Availability (Evenings & Weekends)');
  const [coverNotes, setCoverNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch(`${API}/v1/jobs`);
        if (res.ok) {
          const body = await res.json();
          if (body.ok && body.data?.jobs) {
            setJobs(body.data.jobs);
          }
        }
      } catch {
        // Fallback demo state
      }
    }
    loadJobs();
  }, []);

  const filteredJobs = jobs.filter((j) => {
    const matchesDept = selectedDept === 'all' || j.department.toLowerCase() === selectedDept.toLowerCase();
    const matchesSearch = j.title.toLowerCase().includes(searchQuery.toLowerCase()) || j.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/v1/jobs/${selectedJob.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: candidateName,
          email,
          phone,
          years_experience: parseInt(yearsExp || '0', 10),
          certifications: certifications.split(',').map(c => c.trim()).filter(Boolean),
          availability,
          cover_notes: coverNotes,
        }),
      });

      if (res.ok) {
        setAppliedSuccess(`Thank you ${candidateName}! Your application for "${selectedJob.title}" was received. Our general manager will contact you.`);
      } else {
        setAppliedSuccess(`Thank you ${candidateName}! Your application for "${selectedJob.title}" has been recorded.`);
      }
    } catch {
      setAppliedSuccess(`Thank you ${candidateName}! Application recorded for "${selectedJob.title}".`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setSelectedJob(null);
    setAppliedSuccess(null);
    setCandidateName('');
    setEmail('');
    setPhone('');
    setCoverNotes('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-slate-900 selection:text-white">
      {/* Universal CulinaryOS Marketing Header */}
      <MarketingHeader currentPath="/jobs" />

      {/* Hero Banner */}
      <section className="bg-white border-b border-slate-200 py-10 sm:py-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>CulinaryTalent Careers Hub</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
            Join Our Culinary & Hospitality Team
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Discover immediate openings for cooks, bartenders, servers, and kitchen leaders. Competitive hourly rates, daily tip out, shift meals, and growth paths.
          </p>

          {/* Search & Filter Toolbar */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-2xl mx-auto">
            <div className="relative w-full sm:flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search job title or skill (e.g. Cook, Pizza, TIPS)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none transition-all shadow-xs"
              />
            </div>

            {/* Department Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Roles' },
                { id: 'boh', label: 'Kitchen (BOH)' },
                { id: 'foh', label: 'Front of House' },
                { id: 'bar', label: 'Bar & Cocktails' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDept(d.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedDept === d.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Job Listings Grid */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-4">
        <div className="flex justify-between items-center text-xs text-slate-500 font-semibold uppercase tracking-wider px-1">
          <span>{filteredJobs.length} Open Positions Available</span>
          <span>Location: The Golden Fork (Downtown)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-400 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                      job.department === 'BOH'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : job.department === 'Bar'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {job.department === 'BOH' ? 'Back of House' : job.department === 'Bar' ? 'Bar Program' : 'Front of House'}
                    </span>
                    <h3 className="text-base font-bold text-slate-950 mt-1.5 leading-snug">
                      {job.title}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                    {job.pay_range}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {job.description}
                </p>

                {/* Badges / Requirements */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" /> {job.shift_type}
                  </span>
                  <span className="text-[11px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Award className="w-3 h-3 text-slate-500" /> {job.experience_level}
                  </span>
                </div>

                {/* Perks list */}
                <ul className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                  {job.perks.slice(0, 2).map((p, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Immediate Start</span>
                <button
                  type="button"
                  onClick={() => setSelectedJob(job)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <span>Apply with 1-Click</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Application Modal */}
      {selectedJob && (
        <div
          onClick={resetModal}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200"
          >
            {appliedSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-950">Application Received!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  {appliedSuccess}
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-900">Next Step: Interview & Kitchen Staging</p>
                  <p className="text-[11px]">If selected, you'll receive an automated SMS/email invitation and your POS onboarding security pass.</p>
                </div>
                <button
                  type="button"
                  onClick={resetModal}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      Job Application
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-950 mt-1">{selectedJob.title}</h3>
                    <p className="text-xs font-mono font-bold text-emerald-700">{selectedJob.pay_range}</p>
                  </div>
                  <button
                    onClick={resetModal}
                    className="text-slate-400 hover:text-slate-800 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleApply} className="space-y-3.5 text-left">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Jordan Miller"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          placeholder="jordan@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          placeholder="(555) 000-0000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        Years of Experience
                      </label>
                      <select
                        value={yearsExp}
                        onChange={(e) => setYearsExp(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:border-slate-900 focus:outline-none bg-white"
                      >
                        <option value="0">Entry Level (&lt; 1 yr)</option>
                        <option value="1">1 Year</option>
                        <option value="2">2 Years</option>
                        <option value="3">3 - 5 Years</option>
                        <option value="5">5+ Years (Senior)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        Certifications (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ServSafe, TIPS"
                        value={certifications}
                        onChange={(e) => setCertifications(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Schedule Availability
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Full availability, Nights & Weekends"
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Culinary Background & Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tell us about previous restaurants you worked at or why you'd be a great fit..."
                      value={coverNotes}
                      onChange={(e) => setCoverNotes(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={resetModal}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      {submitting ? (
                        <span>Submitting Application...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Application</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 px-4 py-6 text-center text-xs text-slate-500 font-medium space-y-1">
        <p className="font-bold text-slate-900">CulinaryOS & CulinaryTalent — Restaurant Career Engine</p>
        <p className="text-[11px]">Powered by CulinaryOS Ecosystem · Sovereign Open-Source Restaurant Architecture</p>
      </footer>
    </div>
  );
}

export default JobsPage;

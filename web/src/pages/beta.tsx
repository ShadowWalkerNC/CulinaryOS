import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function BetaSignup() {
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from('beta_applications').insert({
      business_name: form.get('business_name'),
      business_type: form.get('business_type'),
      current_pos:   form.get('current_pos'),
      primary_pain:  form.get('primary_pain'),
      phone:         form.get('phone'),
      email:         form.get('email'),
      location:      form.get('location'),
      applied_at:    new Date().toISOString(),
      status:        'pending',
    });
    setSubmitted(true);
  }

  if (submitted) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <h2 className="text-3xl font-bold text-green-700">You're on the list.</h2>
      <p className="mt-4 text-gray-600">
        Nate will call you personally within 48 hours. Not an email. A phone call.
      </p>
    </div>
  );

  return (
    <main className="max-w-lg mx-auto py-16 px-4">
      <h1 className="text-4xl font-bold text-gray-900">Join the Beta</h1>
      <p className="mt-3 text-gray-500">
        8–12 operators. Personal onboarding. Free during beta.
        First 5 to convert get lifetime access — forever.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input required name="business_name" placeholder="Business name"
          className="w-full border rounded-lg px-4 py-3" />
        <select required name="business_type" className="w-full border rounded-lg px-4 py-3">
          <option value="">Business type...</option>
          <option>Food Truck</option>
          <option>Café</option>
          <option>Restaurant</option>
          <option>Bar</option>
          <option>Senior Living</option>
          <option>Other</option>
        </select>
        <input required name="location" placeholder="City, State"
          className="w-full border rounded-lg px-4 py-3" />
        <select required name="current_pos" className="w-full border rounded-lg px-4 py-3">
          <option value="">Current POS system...</option>
          <option>Square</option>
          <option>Toast</option>
          <option>Clover</option>
          <option>Paper / None</option>
          <option>Other</option>
        </select>
        <textarea required name="primary_pain" rows={3}
          placeholder="What's your biggest frustration with your current setup?"
          className="w-full border rounded-lg px-4 py-3" />
        <input required name="phone" type="tel" placeholder="Phone number (Nate will call)"
          className="w-full border rounded-lg px-4 py-3" />
        <input required name="email" type="email" placeholder="Email"
          className="w-full border rounded-lg px-4 py-3" />
        <button type="submit"
          className="w-full bg-green-700 text-white font-bold py-4 rounded-lg text-lg hover:bg-green-800">
          Apply for Beta Access
        </button>
      </form>
      <p className="mt-6 text-sm text-gray-400 text-center">
        No payment required. No contract. Nate calls every applicant personally.
      </p>
    </main>
  );
}
